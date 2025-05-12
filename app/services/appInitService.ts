import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from './socketService';
import chatService from './chatService';

/**
 * Service to handle app-level initialization
 */
class AppInitService {
  private initialized: boolean = false;

  /**
   * Initialize app services based on user preferences
   * This should be called once when the app starts
   * Note: Socket initialization is now managed by SocketProvider
   */
  public async initializeAppServices(): Promise<void> {
    if (this.initialized) {
      console.log('[AppInitService] Services already initialized');
      return;
    }

    console.log('[AppInitService] Initializing app services...');
    
    try {
      // Get user data to check preferences
      const userData = await AsyncStorage.getItem('userData');
      
      if (!userData) {
        console.log('[AppInitService] No user data found, skipping initialization');
        return;
      }
      
      const user = JSON.parse(userData);
      console.log('[AppInitService] User loaded:', user.name || user.id);
      
      // Note: We no longer need to initialize sockets here since SocketProvider handles that
      // Just log preferences for debugging purposes
      
      // Check if direct messages (DMs) are enabled
      const enableDms = user.enableDms === true;
      console.log(`[AppInitService] Direct messages enabled: ${enableDms}`);
      
      // Check if location sharing is enabled
      const sharePosition = user.sharePosition === true;
      console.log(`[AppInitService] Location sharing enabled: ${sharePosition}`);
      
      // Initialize other app services that don't depend on sockets
      // ...
      
      this.initialized = true;
      console.log('[AppInitService] App services initialization complete');
      
    } catch (error) {
      console.error('[AppInitService] Error initializing app services:', error);
    }
  }
  
  /**
   * Reset initialization state - called when user logs out
   */
  public reset(): void {
    this.initialized = false;
    console.log('[AppInitService] App initialization state reset');
  }
}

// Create and export singleton instance
export const appInitService = new AppInitService();
export default appInitService; 