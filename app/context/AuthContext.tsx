import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/user';
import appInitService from '../services/appInitService';
import socketService from '../services/socketService';

// Context Type Definition
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateUserPreferences: (preferences: Partial<User>) => Promise<User>;
}

// Create context with undefined as default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider component to wrap application and provide authentication state
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on app start
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        const storedToken = await AsyncStorage.getItem('token');
        
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (userData: User, authToken: string) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      await AsyncStorage.setItem('token', authToken);
      setUser(userData);
      setToken(authToken);
      
      // Initialize non-socket app services
      // Socket connections are managed by SocketProvider which will detect the user state change
      await appInitService.initializeAppServices();
    } catch (error) {
      console.error('Error storing user data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // First, ensure socket is disconnected
      socketService.disconnect();
      
      // Then remove user data
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('token');
      
      // Update state
      setUser(null);
      setToken(null);
      
      // Reset app services
      appInitService.reset();
    } catch (error) {
      console.error('Error removing user data:', error);
      throw error;
    }
  };
  
  const updateUserPreferences = async (preferences: Partial<User>): Promise<User> => {
    try {
      if (!user) {
        throw new Error('No user is logged in');
      }
      
      // Update user object with new preferences
      const updatedUser = { ...user, ...preferences };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      
      // Handle socket-related preferences changes
      // These will be picked up by the SocketProvider automatically
      if (preferences.sharePosition !== undefined) {
        // Update socket service's location sharing preference
        await socketService.saveLocationSharingPreference(!!preferences.sharePosition);
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        updateUserPreferences,
        isAuthenticated: !!user && user.isActivated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 