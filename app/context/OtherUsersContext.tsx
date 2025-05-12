import React, { createContext, useContext, useState, useEffect } from 'react';
import socketService, { UserData } from '../services/socketService';
import { useAuth } from './AuthContext';

// Define the OtherUser interface
export interface OtherUser {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  color: string;
}

// Context type
interface OtherUsersContextType {
  otherUsers: OtherUser[];
}

// Create context with default empty array
const OtherUsersContext = createContext<OtherUsersContextType>({ otherUsers: [] });

// Provider component
export const OtherUsersProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user } = useAuth();
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  
  useEffect(() => {
    if (!user) return;
    
    console.log('[OtherUsersContext] Setting up users update listener');
    
    const cleanupUsersListener = socketService.addEventListener('users_update', (users: UserData[]) => {
      const transformedUsers = users
        .filter(u => u.id !== user.id && u.location)
        .map(u => ({
          id: String(u.id),
          name: u.name,
          longitude: parseFloat(String(u.location?.longitude)),
          latitude: parseFloat(String(u.location?.latitude)),
          color: '255, 87, 34'
        }));
      
      if (transformedUsers.length > 0) {
        console.log(`[OtherUsersContext] Updating other users (${transformedUsers.length})`);
        setOtherUsers(transformedUsers);
      }
    });
    
    return () => {
      console.log('[OtherUsersContext] Cleaning up users update listener');
      cleanupUsersListener();
    };
  }, [user]);

  return (
    <OtherUsersContext.Provider value={{ otherUsers }}>
      {children}
    </OtherUsersContext.Provider>
  );
};

// Hook to use the context
export const useOtherUsersContext = () => useContext(OtherUsersContext); 