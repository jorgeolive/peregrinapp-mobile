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
      console.log('[AppInitService] User loaded:', user);
      
      // Check if direct messages (DMs) are enabled
      const enableDms = user.enableDms === true;
      console.log(`[AppInitService] Direct messages enabled: ${enableDms}`);
      
      // Check if location sharing is enabled
      const sharePosition = user.sharePosition === true;
      console.log(`[AppInitService] Location sharing enabled: ${sharePosition}`);
      
      // If either feature is enabled, we need to initialize the socket
      if (enableDms || sharePosition) {
        console.log('[AppInitService] Chat or location sharing is enabled, initializing socket services');
        
        // Initialize the socket connection
        const socketInitialized = await socketService.init();
        console.log(`[AppInitService] Socket initialization result: ${socketInitialized}`);
        
        // If DMs are enabled, initialize the chat service
        if (enableDms && socketInitialized) {
          console.log('[AppInitService] Initializing chat service for DMs');
          await chatService.init();
        }
        
        // Location service initialization happens automatically through socketService
      } else {
        console.log('[AppInitService] Both chat and location sharing are disabled, skipping socket initialization');
      }
      
      this.initialized = true;
      console.log('[AppInitService] App services initialization complete');
      
    } catch (error) {
      console.error('[AppInitService] Error initializing app services:', error);
    }
  }
}

// Create and export singleton instance
export const appInitService = new AppInitService();
export default appInitService; 