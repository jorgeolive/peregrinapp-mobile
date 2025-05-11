import { useState, useEffect } from 'react';
import socketService, { UserData } from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export interface OtherUser {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  color: string;
}

export function useOtherUsers() {
  const { user } = useAuth();
  const { isConnected, forceReconnect } = useSocket();
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  
  // Set up user updates listener
  useEffect(() => {
    if (!user) return;
    
    // Set up callback for user updates
    const cleanupUsersListener = socketService.addEventListener('users_update', (users: UserData[]) => {
      // Transform users from socket to the format needed by MapLayers
      const transformedUsers = users
        .filter(u => u.id !== user.id && u.location)
        .map(u => {
          return {
            id: String(u.id),
            name: u.name,
            longitude: parseFloat(String(u.location?.longitude)),
            latitude: parseFloat(String(u.location?.latitude)),
            color: '255, 87, 34' // Default color
          };
        });
      
      if (transformedUsers.length > 0) {
        setOtherUsers(transformedUsers);
      }
    });
    
    // No need to initialize socket - SocketProvider handles that
    // No need to disconnect socket on cleanup - SocketProvider handles that
    
    return () => {
      // Just clean up our listener
      cleanupUsersListener();
    };
  }, [user]);

  // Return connection status from the SocketContext instead of local state
  return {
    otherUsers,
    isConnectedToSocket: isConnected,
    ensureSocketConnection: forceReconnect // Use the context's forceReconnect function
  };
} 