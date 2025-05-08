import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import axios from 'axios';

// Define types for user location and user data
export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface UserData {
  id: string;
  name: string;
  location: UserLocation | null;
  lastUpdate: number;
}

export interface AuthData {
  userId: string;
  username: string;
  sharePosition: boolean;
}

export type ConnectionErrorType = 
  | 'token_expired'
  | 'token_invalid'
  | 'user_not_found'
  | 'account_not_activated'
  | 'connection_error'
  | 'unknown';

export interface ConnectionError {
  type: ConnectionErrorType;
  message: string;
}

const SERVER_URL = API_BASE_URL;

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private locationUpdateInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private isAuthenticated: boolean = false;
  private locationSharing: boolean = false;
  private getCurrentPositionFn: (() => Promise<UserLocation | null>) | null = null;
  private authData: AuthData | null = null;
  private connectionError: ConnectionError | null = null;

  // Callbacks
  private onUsersUpdate: ((users: UserData[]) => void) | null = null;
  private onConnectionError: ((error: ConnectionError) => void) | null = null;
  private onAuthenticated: ((authData: AuthData) => void) | null = null;
  private onDisconnect: ((reason: string) => void) | null = null;

  /**
   * Initialize socket connection
   */
  public async init(): Promise<boolean> {
    try {
      console.log('[SocketService] Initializing socket connection');
      
      // Reset previous state
      this.disconnect();
      this.connectionError = null;
      
      // Check if location sharing is enabled in AsyncStorage
      const shouldShareLocation = await this.getLocationSharingPreference();
      this.locationSharing = shouldShareLocation;
      console.log(`[SocketService] Location sharing preference: ${shouldShareLocation}`);
      
      // If location sharing is disabled, don't initialize the connection
      if (!shouldShareLocation) {
        console.log('[SocketService] Location sharing disabled, not initializing socket');
        return false;
      }
      
      // Using 'token' key to match the rest of the app
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('[SocketService] No authentication token found');
        this.handleConnectionError({
          type: 'token_invalid',
          message: 'No authentication token found'
        });
        return false;
      }
      console.log('[SocketService] Token found, connecting to server');

      // Check if server is reachable
      console.log(`[SocketService] Checking if server is reachable at ${SERVER_URL}`);
      try {
        const response = await fetch(`${SERVER_URL}/health`, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (!response.ok) {
          console.log(`[SocketService] Server health check failed: ${response.status}`);
        } else {
          console.log('[SocketService] Server is reachable');
        }
      } catch (error) {
        console.log(`[SocketService] Server health check error: ${error}`);
        // Continue anyway, maybe the health endpoint doesn't exist
      }

      // Connect to the Socket.IO server with authentication token
      this.socket = io(SERVER_URL, {
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 30000, // Increased timeout to 30 seconds
        transports: ['websocket', 'polling'] // Try websocket first, fall back to polling
      });
      console.log(`[SocketService] Socket created with server URL: ${SERVER_URL}`);

      this.setupEventListeners();

      // Set a manual timeout in case socket.io's built-in timeout doesn't trigger
      const connectionPromise = new Promise<boolean>((resolve) => {
        // Setup a listener for successful connection
        const onConnect = () => {
          console.log('[SocketService] Connection successful');
          clearTimeout(timeoutId);
          if (this.socket) {
            this.socket.off('connect', onConnect);
          }
          resolve(true);
        };

        // Setup a listener for connection error
        const onError = (err: Error) => {
          console.log(`[SocketService] Connection error: ${err.message}`);
          clearTimeout(timeoutId);
          if (this.socket) {
            this.socket.off('connect_error', onError);
          }
          resolve(false);
        };

        this.socket.once('connect', onConnect);
        this.socket.once('connect_error', onError);

        // Set a timeout
        const timeoutId = setTimeout(() => {
          console.log('[SocketService] Connection attempt timed out after 30 seconds');
          if (this.socket) {
            this.socket.off('connect', onConnect);
            this.socket.off('connect_error', onError);
          }
          this.handleConnectionError({
            type: 'connection_error',
            message: 'Connection timed out'
          });
          resolve(false);
        }, 30000);
      });

      return await connectionPromise;
    } catch (error) {
      console.error('[SocketService] Socket initialization error:', error);
      this.handleConnectionError({
        type: 'unknown',
        message: 'Failed to initialize socket connection'
      });
      return false;
    }
  }

  /**
   * Set up Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) {
      console.error('[SocketService] Cannot setup event listeners: socket is null');
      return;
    }
    console.log('[SocketService] Setting up event listeners');

    this.socket.on('connect', () => {
      console.log('[SocketService] Socket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('authenticated', (data: AuthData) => {
      console.log('[SocketService] Socket authenticated', data);
      this.isAuthenticated = true;
      this.authData = data;
      
      // Call the onAuthenticated callback if set
      if (this.onAuthenticated) {
        this.onAuthenticated(data);
      }
      
      // If location sharing was enabled before reconnection, restart it
      if (this.locationSharing && this.getCurrentPositionFn) {
        console.log('[SocketService] Starting location updates after authentication');
        // Instead of calling startLocationUpdates again, directly set up the interval here
        // to avoid potential recursive issues
        
        // Clear any existing interval first
        if (this.locationUpdateInterval) {
          clearInterval(this.locationUpdateInterval);
          this.locationUpdateInterval = null;
        }
        
        console.log('[SocketService] Setting up location update interval after authentication');
        
        // Set up the interval for location updates
        this.locationUpdateInterval = setInterval(async () => {
          try {
            if (!this.getCurrentPositionFn || !this.socket || !this.isConnected) {
              console.log('[SocketService] Skipping location update - missing dependencies');
              return;
            }
            
            const position = await this.getCurrentPositionFn();
            if (position) {
              console.log(`[SocketService] Sending location update: ${JSON.stringify(position)}`);
              this.socket.emit('update_location', position);
            } else {
              console.log('[SocketService] Could not get current position, skipping update');
            }
          } catch (error) {
            console.error('[SocketService] Error getting or sending location:', error);
          }
        }, 10000); // Update every 10 seconds
      }
    });

    this.socket.on('users_update', (users: UserData[]) => {
      console.log(`[SocketService] Received users update with ${users.length} users`);
      if (this.onUsersUpdate) {
        this.onUsersUpdate(users);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[SocketService] Socket disconnected: ${reason}`);
      this.isConnected = false;
      
      // Call the onDisconnect callback if set
      if (this.onDisconnect) {
        this.onDisconnect(reason);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Socket connection error:', error.message);
      this.reconnectAttempts++;
      
      // Parse the error message to determine the specific issue
      const errorMsg = error.message || '';
      let errorType: ConnectionErrorType = 'unknown';
      
      if (errorMsg.includes('Token has expired')) {
        errorType = 'token_expired';
      } else if (errorMsg.includes('User not found')) {
        errorType = 'user_not_found';
      } else if (errorMsg.includes('Account not activated')) {
        errorType = 'account_not_activated';
      } else if (errorMsg.includes('Invalid token')) {
        errorType = 'token_invalid';
      } else {
        errorType = 'connection_error';
      }
      
      console.log(`[SocketService] Connection error type: ${errorType}, attempt: ${this.reconnectAttempts}/5`);
      
      this.handleConnectionError({
        type: errorType,
        message: errorMsg || 'Connection error'
      });
      
      if (this.reconnectAttempts > 5) {
        console.log('[SocketService] Max reconnection attempts reached, giving up');
        this.disconnect();
      }
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: ConnectionError): void {
    this.connectionError = error;
    
    // Special handling for token expiry
    if (error.type === 'token_expired' || error.type === 'token_invalid') {
      // Clear the invalid token
      AsyncStorage.removeItem('token').catch(e => 
        console.error('[SocketService] Failed to remove invalid token:', e)
      );
    }
    
    // Call the error callback if set
    if (this.onConnectionError) {
      this.onConnectionError(error);
    }
  }

  /**
   * Set callback for connection errors
   */
  public setOnConnectionError(callback: (error: ConnectionError) => void): void {
    this.onConnectionError = callback;
  }

  /**
   * Get the last connection error
   */
  public getConnectionError(): ConnectionError | null {
    return this.connectionError;
  }

  /**
   * Set callback for authentication events
   */
  public setOnAuthenticated(callback: (authData: AuthData) => void): void {
    this.onAuthenticated = callback;
  }

  /**
   * Set callback for disconnect events
   */
  public setOnDisconnect(callback: (reason: string) => void): void {
    this.onDisconnect = callback;
  }
  
  /**
   * Set callback for user updates
   */
  public setOnUsersUpdate(callback: (users: UserData[]) => void): void {
    this.onUsersUpdate = callback;
  }

  /**
   * Start sending location updates to the server
   */
  public startLocationUpdates(getCurrentPosition: () => Promise<UserLocation | null>): void {
    console.log(`[SocketService] Starting location updates - authenticated: ${this.isAuthenticated}, socket connected: ${!!this.socket}`);
    
    // Store the function for later use even if we can't start updates right now
    this.getCurrentPositionFn = getCurrentPosition;
    this.locationSharing = true;
    
    if (!this.socket || !this.isConnected) {
      console.log('[SocketService] Socket not connected, initializing before starting updates');
      this.init().then(initialized => {
        if (initialized) {
          console.log('[SocketService] Socket initialized, waiting for authentication...');
          // Authentication will trigger location updates through the 'authenticated' event handler
        } else {
          console.log('[SocketService] Failed to initialize socket');
        }
      });
      return;
    }
    
    if (!this.isAuthenticated) {
      console.log('[SocketService] Socket connected but not authenticated, waiting for authentication event');
      // We'll let the 'authenticated' event handler start the location updates
      return;
    }

    // If we reach here, we're connected and authenticated, so we can start the updates
    console.log('[SocketService] Socket connected and authenticated, starting location updates');
    
    // Clear any existing interval
    if (this.locationUpdateInterval) {
      console.log('[SocketService] Clearing existing location update interval');
      clearInterval(this.locationUpdateInterval);
    }

    console.log('[SocketService] Setting up location update interval (every 10 seconds)');
    
    // Set up an interval to send location updates
    this.locationUpdateInterval = setInterval(async () => {
      try {
        if (!this.getCurrentPositionFn || !this.socket || !this.isConnected) {
          console.log('[SocketService] Skipping location update - missing dependencies');
          return;
        }
        
        console.log('[SocketService] Getting current position...');
        const position = await this.getCurrentPositionFn();
        if (position) {
          console.log(`[SocketService] Sending location update: ${JSON.stringify(position)}`);
          this.socket.emit('update_location', position);
        } else {
          console.log('[SocketService] Could not get current position, skipping update');
        }
      } catch (error) {
        console.error('[SocketService] Error getting or sending location:', error);
      }
    }, 10000); // Update every 10 seconds
  }

  /**
   * Stop sending location updates
   */
  public stopLocationUpdates(): void {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
    
    if (this.socket && this.isConnected) {
      // Notify server to stop location sharing - server will disconnect the socket
      this.socket.emit('stop_location_sharing');
      
      // We don't need to disconnect here as the server will do it
      // The disconnect event will be handled by our event listeners
    }
    
    this.locationSharing = false;
    console.log('Stopped location updates');
  }

  /**
   * Update location once
   */
  public updateLocation(location: UserLocation): void {
    if (this.socket && this.isConnected && this.locationSharing) {
      console.log('Manually updating location:', location);
      this.socket.emit('update_location', location);
    }
  }

  /**
   * Check if location sharing is enabled
   */
  public isLocationSharingEnabled(): boolean {
    return this.locationSharing;
  }

  /**
   * Check if socket is authenticated
   */
  public isSocketAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get authentication data
   */
  public getAuthData(): AuthData | null {
    return this.authData;
  }

  /**
   * Disconnect the socket
   */
  public disconnect(): void {
    this.stopLocationUpdates();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.isAuthenticated = false;
    this.authData = null;
    console.log('Socket disconnected');
  }

  /**
   * Handle user preference change
   * @param sharePosition Whether the user wants to share their position
   */
  public handleSharePositionChange(sharePosition: boolean): void {
    if (sharePosition && !this.locationSharing && this.getCurrentPositionFn) {
      // User enabled location sharing, start updates
      this.startLocationUpdates(this.getCurrentPositionFn);
    } else if (!sharePosition && this.locationSharing) {
      // User disabled location sharing, stop updates and disconnect
      this.stopLocationUpdates();
    }
  }

  /**
   * Get location sharing preference from AsyncStorage
   */
  public async getLocationSharingPreference(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem('sharePosition');
      return value === 'true';
    } catch (error) {
      console.error('Error getting location sharing preference:', error);
      return false;
    }
  }

  /**
   * Save location sharing preference to AsyncStorage
   */
  public async saveLocationSharingPreference(sharePosition: boolean): Promise<void> {
    try {
      console.log(`[SocketService] Saving location sharing preference: ${sharePosition}`);
      await AsyncStorage.setItem('sharePosition', sharePosition ? 'true' : 'false');
      this.locationSharing = sharePosition;
      
      // Update socket connection based on preference
      if (sharePosition && this.getCurrentPositionFn) {
        console.log('[SocketService] Location sharing enabled, initializing socket');
        if (!this.isConnected || !this.isAuthenticated) {
          const initialized = await this.init();
          console.log(`[SocketService] Socket initialization result: ${initialized}`);
        }
        this.startLocationUpdates(this.getCurrentPositionFn);
      } else if (!sharePosition) {
        console.log('[SocketService] Location sharing disabled, stopping updates');
        this.stopLocationUpdates();
      }
    } catch (error) {
      console.error('[SocketService] Error saving location sharing preference:', error);
    }
  }
}

// Create and export a singleton instance
export const socketService = new SocketService();
export default socketService;