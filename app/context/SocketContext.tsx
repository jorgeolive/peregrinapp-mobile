import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import socketService from '../services/socketService';
import chatService from '../services/chatService';
import { useAuth } from './AuthContext';

// Define the context type
interface SocketContextType {
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionError: string | null;
  forceReconnect: () => Promise<boolean>;
}

// Create the context
const SocketContext = createContext<SocketContextType | undefined>(undefined);

/**
 * Socket Provider component to manage socket connection lifecycle
 */
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  
  // Connection state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isAuthenticatedSocket, setIsAuthenticatedSocket] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  
  // Debug state
  const [lastReconnectAttempt, setLastReconnectAttempt] = useState<Date | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  /**
   * Initialize socket connection with debounce to prevent multiple attempts
   */
  const initializeSocket = useCallback(async () => {
    if (!token || !user || isConnecting) {
      console.log('[SocketContext] Skipping socket initialization - no user/token or already connecting');
      return false;
    }

    try {
      setIsConnecting(true);
      setLastReconnectAttempt(new Date());
      
      // Initialize socket service
      const socketInitialized = await socketService.init();
      setIsConnected(socketInitialized);
      
      if (socketInitialized) {
        // Set authentication state
        setIsAuthenticatedSocket(socketService.isSocketAuthenticated());
        
        // Initialize chat service if socket is connected
        if (user.enableDms === true) {
          await chatService.init();
        }
      } else {
        // Get error message if connection failed
        const error = socketService.getConnectionError();
        setConnectionError(error ? error.message : 'Unknown connection error');
      }
      
      return socketInitialized;
    } catch (error) {
      console.error('[SocketContext] Socket initialization error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [token, user, isConnecting]);

  /**
   * Force reconnection - can be called from components when needed
   */
  const forceReconnect = useCallback(async () => {
    console.log('[SocketContext] Force reconnect requested');
    if (isConnecting) {
      console.log('[SocketContext] Already connecting, ignoring force reconnect');
      return false;
    }
    
    // Disconnect existing socket first
    socketService.disconnect();
    setIsConnected(false);
    setIsAuthenticatedSocket(false);
    
    // Wait a short while before reconnecting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return initializeSocket();
  }, [initializeSocket, isConnecting]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Only care about transitions to/from active state
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[SocketContext] App has come to the foreground, checking connection');
        
        // Check if socket is disconnected and reconnect if needed
        if (!socketService.isSocketConnected() && user && token) {
          console.log('[SocketContext] Socket disconnected, reconnecting...');
          initializeSocket();
        }
      } else if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('[SocketContext] App has gone to the background');
        // We keep the socket connected but we could disconnect here to save battery
        // Uncomment this line to disconnect on app backgrounding:
        // socketService.disconnect();
      }
      
      setAppState(nextAppState);
    };
    
    // Set up app state change listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      appStateSubscription.remove();
    };
  }, [appState, initializeSocket, user, token]);

  /**
   * Handle network state changes
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !socketService.isSocketConnected() && user && token) {
        console.log('[SocketContext] Network reconnected, reconnecting socket...');
        initializeSocket();
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [initializeSocket, user, token]);

  /**
   * Initialize socket connection when user logs in
   */
  useEffect(() => {
    if (user && token && isAuthenticated && !isConnected) {
      console.log('[SocketContext] User authenticated, initializing socket');
      initializeSocket();
    } else if (!user && isConnected) {
      console.log('[SocketContext] User logged out, disconnecting socket');
      socketService.disconnect();
      setIsConnected(false);
      setIsAuthenticatedSocket(false);
    }
  }, [user, token, isAuthenticated, isConnected, initializeSocket]);

  /**
   * Set up socket event listeners
   */
  useEffect(() => {
    // Set up socket auth changed listener
    const authCleanup = socketService.addEventListener('authenticated', (data) => {
      console.log('[SocketContext] Socket authenticated event', data);
      setIsAuthenticatedSocket(true);
    });
    
    // Set up socket disconnect listener
    const disconnectCleanup = socketService.addEventListener('disconnect', (reason) => {
      console.log('[SocketContext] Socket disconnected event:', reason);
      setIsConnected(false);
      setIsAuthenticatedSocket(false);
    });
    
    // Set up socket connect listener
    const connectCleanup = socketService.addEventListener('connect', () => {
      console.log('[SocketContext] Socket connected event');
      setIsConnected(true);
    });
    
    // Set up socket connect error listener
    const errorCleanup = socketService.addEventListener('connect_error', (error) => {
      console.log('[SocketContext] Socket error event:', error);
      setIsConnected(false);
      setIsAuthenticatedSocket(false);
      setConnectionError(error.message || 'Unknown connection error');
    });
    
    return () => {
      // Clean up all listeners
      authCleanup();
      disconnectCleanup();
      connectCleanup();
      errorCleanup();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        isAuthenticated: isAuthenticatedSocket,
        connectionError,
        forceReconnect
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Hook to use socket context
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}; 