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
  private intervalActive: boolean = false;
  private lastIntervalTick: number = 0;
  private reconnectAttempts: number = 0;
  private isAuthenticated: boolean = false;
  private locationSharing: boolean = false;
  private getCurrentPositionFn: (() => Promise<UserLocation | null>) | null = null;
  private authData: AuthData | null = null;
  private connectionError: ConnectionError | null = null;
  private _lastLocationUpdateTime: number = 0;

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
        // Create a controller for aborting the fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Try to reach the server - use a simple HEAD request to the base URL
        // A 404 still means the server is up but the endpoint doesn't exist
        const response = await fetch(SERVER_URL, { 
          method: 'HEAD',  // Just check headers, don't download content
          signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        // With a HEAD request, even a 404 means the server is running
        if (response.status >= 500) {
          console.log(`[SocketService] Server appears to be down: ${response.status}`);
        } else {
          console.log('[SocketService] Server is reachable (status: ' + response.status + ')');
        }
      } catch (error) {
        console.log(`[SocketService] Server connection check error: ${error}`);
        // Continue anyway - we'll try to connect with socket.io regardless
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

        // Only add listeners if socket exists
        if (this.socket) {
          this.socket.once('connect', onConnect);
          this.socket.once('connect_error', onError);
        } else {
          resolve(false);
        }

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
          console.log('[SocketService] Cleared existing interval in authenticated handler');
        }
        
        console.log('[SocketService] Setting up location update interval after authentication');
        
        // Debug timestamp for this auth setup
        const authSetupTime = new Date().toISOString();
        console.log(`[SocketService] Auth interval setup at: ${authSetupTime}`);
        
        // Set up the interval for location updates
        this.locationUpdateInterval = setInterval(() => {
          console.log(`[SocketService] Auth interval tick from setup at ${authSetupTime}`);
          
          this._processLocationUpdate().catch(error => {
            console.error('[SocketService] Error in authenticated interval update:', error);
          });
        }, 10000); // Update every 10 seconds
        
        // Immediate first update after authentication
        console.log('[SocketService] Triggering immediate update after authentication');
        this._processLocationUpdate().catch(error => {
          console.error('[SocketService] Error in immediate authentication update:', error);
        });
      }
    });

    this.socket.on('users_update', (users: UserData[]) => {
      // Filter out current user from the received updates
      console.log(`[SocketService] Raw users_update event received with ${users.length} users`);
      console.log(`[SocketService] FULL USER LIST:`, JSON.stringify(users));
      
      const filteredUsers = users.filter(user => {
        if (!this.authData) return true; // Keep all users if we don't have auth data
        return user.id !== this.authData.userId; // Filter out our own user
      });
      
      console.log(`[SocketService] Received users update with ${users.length} users, filtered to ${filteredUsers.length} after removing current user`);
      console.log(`[SocketService] User data sample:`, JSON.stringify(users[0] || 'no users'));
      
      if (this.onUsersUpdate) {
        console.log(`[SocketService] Calling onUsersUpdate callback with ${filteredUsers.length} users`);
        this.onUsersUpdate(filteredUsers);
      } else {
        console.log(`[SocketService] No onUsersUpdate callback set`);
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
    console.log(`[SocketService] Starting location updates - authenticated: ${this.isAuthenticated}, socket connected: ${!!this.socket && this.isConnected}`);
    
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
    
    this._setupLocationUpdateInterval();
  }

  /**
   * Set up the interval safely with proper error handling and tracking
   */
  private _setupLocationUpdateInterval(): void {
    // Always properly clear any existing interval first
    this._clearLocationUpdateInterval();
    
    const setupTime = new Date().toISOString();
    console.log(`[SocketService] Setting up NEW location update interval at: ${setupTime}`);
    
    // Store reference to 'this' to avoid context issues in the interval
    const self = this;
    self.intervalActive = true;
    
    // Use a global object to track the interval for debugging
    (global as any).socketIntervalDebug = {
      setupTime,
      latestTick: 0,
    };
    
    // Set up a new interval with proper context
    this.locationUpdateInterval = setInterval(() => {
      const now = Date.now();
      self.lastIntervalTick = now;
      (global as any).socketIntervalDebug.latestTick = now;
      
      console.log(`[SocketService] Interval tick (${now}) from setup at ${setupTime}`);
      
      self._processLocationUpdate().catch(error => {
        console.error('[SocketService] Error in interval location update:', error);
      });
    }, 10000);
    
    // Ensure the interval is not garbage collected
    (global as any).intervalKeepAlive = this.locationUpdateInterval;
    
    // Immediate first update to verify everything works
    console.log('[SocketService] Triggering immediate first update');
    this._processLocationUpdate().catch(error => {
      console.error('[SocketService] Error in immediate location update:', error);
    });
  }

  /**
   * Clear the interval safely
   */
  private _clearLocationUpdateInterval(): void {
    if (this.locationUpdateInterval) {
      console.log('[SocketService] Clearing existing location update interval');
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
      this.intervalActive = false;
      this.lastIntervalTick = 0;
    }
  }

  /**
   * Get detailed information about the interval status
   */
  public getIntervalStatus(): {
    active: boolean;
    lastTick: number;
    intervalId: string | null;
    setupTime: string | null;
  } {
    return {
      active: this.intervalActive,
      lastTick: this.lastIntervalTick,
      intervalId: this.locationUpdateInterval ? String(this.locationUpdateInterval) : null,
      setupTime: (global as any).socketIntervalDebug?.setupTime || null
    };
  }

  /**
   * Force restart the location updates interval
   */
  public forceRestartInterval(): boolean {
    console.log('[SocketService] Forcing restart of location update interval');
    
    if (!this.getCurrentPositionFn) {
      console.log('[SocketService] Cannot restart interval: no position function');
      return false;
    }
    
    if (!this.isConnected || !this.socket) {
      console.log('[SocketService] Cannot restart interval: socket not connected');
      return false;
    }
    
    this._setupLocationUpdateInterval();
    return true;
  }

  /**
   * Extract the location update logic to its own method for reuse and better error handling
   */
  private async _processLocationUpdate(): Promise<void> {
    try {
      if (!this.getCurrentPositionFn || !this.socket || !this.isConnected) {
        console.log('[SocketService] Skipping location update - missing dependencies');
        return;
      }
      
      if (!this.isAuthenticated) {
        console.log('[SocketService] Skipping location update - not authenticated');
        return;
      }
      
      console.log('[SocketService] Getting current position...');
      const position = await this.getCurrentPositionFn();
      if (position) {
        console.log(`[SocketService] Sending location update: ${JSON.stringify(position)}`);
        this.socket.emit('update_location', position);
        this._lastLocationUpdateTime = Date.now();
      } else {
        console.log('[SocketService] Could not get current position, skipping update');
      }
    } catch (error) {
      console.error('[SocketService] Error getting or sending location:', error);
      throw error; // Re-throw for upper-level handling if needed
    }
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
      console.log(`[SocketService] Manually updating location: ${JSON.stringify(location)}`);
      this.socket.emit('update_location', location);
      // Track the last update time for manual updates too
      this._lastLocationUpdateTime = Date.now();
    } else {
      console.log(`[SocketService] Cannot update location - connected: ${!!this.socket && this.isConnected}, authenticated: ${this.isAuthenticated}, sharing: ${this.locationSharing}`);
    }
  }

  /**
   * Force a location update cycle to test the system
   */
  public async forceLocationUpdate(): Promise<boolean> {
    console.log('[SocketService] Forcing a location update cycle');
    if (!this.getCurrentPositionFn) {
      console.log('[SocketService] No position function available');
      return false;
    }
    
    try {
      const position = await this.getCurrentPositionFn();
      if (position && this.socket && this.isConnected) {
        console.log(`[SocketService] Forcing location update: ${JSON.stringify(position)}`);
        this.socket.emit('update_location', position);
        this._lastLocationUpdateTime = Date.now();
        return true;
      } else {
        console.log('[SocketService] Force update failed - no position or socket issues');
        return false;
      }
    } catch (error) {
      console.error('[SocketService] Error in forced location update:', error);
      return false;
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

  /**
   * Get the debugging information about current socket state
   */
  public getDebugInfo(): {
    connected: boolean;
    authenticated: boolean;
    locationSharing: boolean;
    lastError?: string;
    lastLocationUpdate?: number;
  } {
    return {
      connected: !!this.socket && this.isConnected,
      authenticated: this.isAuthenticated,
      locationSharing: this.locationSharing,
      lastError: this.connectionError?.message,
      lastLocationUpdate: this._lastLocationUpdateTime
    };
  }

  /**
   * Check if a position function is set
   */
  public hasPositionFunction(): boolean {
    return this.getCurrentPositionFn !== null;
  }

  /**
   * Set the position function directly
   */
  public setPositionFunction(positionFn: () => Promise<UserLocation | null>): void {
    console.log('[SocketService] Setting position function directly');
    this.getCurrentPositionFn = positionFn;
  }

  /**
   * Send a custom event through the socket connection
   * This allows other services to use the socket without creating their own connection
   */
  public emitEvent(eventName: string, data: any): boolean {
    if (!this.socket || !this.isConnected) {
      console.error(`[SocketService] Cannot emit event ${eventName}: socket not connected`);
      return false;
    }

    try {
      console.log(`[SocketService] Emitting custom event: ${eventName}`, data);
      this.socket.emit(eventName, data);
      return true;
    } catch (error) {
      console.error(`[SocketService] Error emitting event ${eventName}:`, error);
      return false;
    }
  }

  /**
   * Add a listener for a custom event
   * This allows other services to listen for events without managing their own socket
   */
  public addEventListener(eventName: string, callback: (data: any) => void): () => void {
    if (!this.socket) {
      console.error(`[SocketService] Cannot add listener for ${eventName}: socket not initialized`);
      return () => {}; // Return empty cleanup function
    }

    console.log(`[SocketService] Adding listener for event: ${eventName}`);
    this.socket.on(eventName, callback);
    
    // Return a function to remove the listener
    return () => {
      if (this.socket) {
        console.log(`[SocketService] Removing listener for event: ${eventName}`);
        this.socket.off(eventName, callback);
      }
    };
  }
}

// Create and export a singleton instance
export const socketService = new SocketService();
export default socketService;