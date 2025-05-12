import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Link, useFocusEffect } from 'expo-router';
import chatService from '../services/chatService';
import { getUserDetails } from '../services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Conversation {
  userId: string;
  name: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount: number;
}

// Key for AsyncStorage conversations
const CONVERSATIONS_KEY = 'chat_conversations';

export default function ChatScreen() {
  const { user } = useAuth();
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Only for first load
  const [isUpdating, setIsUpdating] = useState(false);    // For background updates
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const firstLoadCompletedRef = useRef(false);
  const fetchedUserNamesRef = useRef<Set<string>>(new Set()); // Track already fetched usernames
  const isPollingPausedRef = useRef(false); // Track if polling should be temporarily paused
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch user details and update conversation name
  // With debouncing and tracking of already fetched names
  const fetchUserName = useCallback(async (userId: string) => {
    // Skip if we've already fetched this user's name
    if (fetchedUserNamesRef.current.has(userId)) {
      return;
    }
    
    // Mark as fetched immediately to prevent duplicate requests
    fetchedUserNamesRef.current.add(userId);
    
    try {
      const response = await getUserDetails(userId);
      if (response.success && response.user && response.user.name) {
        // Need to pause polling during this update to prevent cycles
        isPollingPausedRef.current = true;
        
        // Update the conversation with the real name
        setConversations(prevConversations => {
          // Create a new array with the updated name
          const updatedConversations = prevConversations.map(conv => {
            if (conv.userId === userId && conv.name !== response.user!.name) {
              return { ...conv, name: response.user!.name };
            }
            return conv;
          });
          
          // Resume polling after a short delay
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }
          
          updateTimeoutRef.current = setTimeout(() => {
            isPollingPausedRef.current = false;
            updateTimeoutRef.current = null;
          }, 500);
          
          return updatedConversations;
        });
      }
    } catch (error) {
      console.error(`[ChatScreen] Error fetching user details for ${userId}:`, error);
      // Remove from fetched set if there was an error, so we can retry later
      fetchedUserNamesRef.current.delete(userId);
    }
  }, []);

  // Function to directly load conversations from AsyncStorage
  const loadConversationsFromStorage = useCallback(async (loadType: 'initial' | 'background' = 'background') => {
    // Skip if polling is paused to prevent update cycles
    if (loadType === 'background' && isPollingPausedRef.current) {
      return;
    }
    
    try {
      // Set loading state based on type
      if (loadType === 'initial') setIsInitialLoading(true);
      else setIsUpdating(true);
      
      console.log(`[ChatScreen] Loading conversations (${loadType})`);
      
      const conversationsJSON = await AsyncStorage.getItem(CONVERSATIONS_KEY);
      
      if (!conversationsJSON) {
        console.log('[ChatScreen] No conversations found in AsyncStorage');
        if (conversations.length !== 0) {
          setConversations([]);
        }
        
        // Clear loading states
        if (loadType === 'initial') {
          setIsInitialLoading(false);
          firstLoadCompletedRef.current = true;
        } else {
          setIsUpdating(false);
        }
        return;
      }
      
      try {
        const storedConversations: Record<string, Conversation> = JSON.parse(conversationsJSON);
        
        // Convert to array and sort by timestamp (most recent first)
        const conversationArray = Object.values(storedConversations).sort((a, b) => 
          (b.timestamp || 0) - (a.timestamp || 0)
        );
        
        console.log(`[ChatScreen] Loaded ${conversationArray.length} conversations from AsyncStorage`);
        
        // Check if conversations have changed to prevent unnecessary re-renders
        // We need to compare deeper than just stringification - only care about specific fields
        let hasChanges = conversations.length !== conversationArray.length;
        
        if (!hasChanges) {
          // Check each conversation for changes in important fields
          for (let i = 0; i < conversationArray.length; i++) {
            const newConv = conversationArray[i];
            const oldConv = conversations[i];
            
            if (newConv.userId !== oldConv.userId ||
                newConv.lastMessage !== oldConv.lastMessage ||
                newConv.timestamp !== oldConv.timestamp ||
                newConv.unreadCount !== oldConv.unreadCount) {
              hasChanges = true;
              break;
            }
          }
        }
        
        if (hasChanges) {
          console.log('[ChatScreen] Conversations changed, updating UI');
          setConversations(conversationArray);
          
          // Only fetch user names for new generic names
          for (const conversation of conversationArray) {
            // Only fetch if name is the generic 'User {id}' format AND we haven't fetched it before
            if (conversation.name.startsWith('User ') && !fetchedUserNamesRef.current.has(conversation.userId)) {
              fetchUserName(conversation.userId);
            }
          }
        } else {
          console.log('[ChatScreen] Conversations unchanged, skipping update');
        }
      } catch (parseError) {
        console.error('[ChatScreen] Error parsing conversations JSON:', parseError);
        // Reset to empty array if corrupted
        if (conversations.length !== 0) {
          setConversations([]);
        }
      }
    } catch (error) {
      console.error('[ChatScreen] Error loading conversations from AsyncStorage:', error);
    } finally {
      // Always clear loading states
      if (loadType === 'initial') {
        setIsInitialLoading(false);
        firstLoadCompletedRef.current = true;
      } else {
        setIsUpdating(false);
      }
    }
  }, [conversations, fetchUserName]);

  // Set up polling effect when screen is in focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[ChatScreen] Screen focused, starting polling');
      
      // Load conversations immediately when focused
      if (firstLoadCompletedRef.current) {
        // This isn't the first load, use background loading
        loadConversationsFromStorage('background');
      }
      
      // Set up a polling interval
      pollingIntervalRef.current = setInterval(() => {
        loadConversationsFromStorage('background');
      }, 2000); // Poll every 2 seconds
      
      // Check connection status
      const checkConnection = async () => {
        const connected = chatService.isSocketConnected();
        setIsConnected(connected);
      };
      
      checkConnection();
      
      // Clean up interval when screen loses focus
      return () => {
        console.log('[ChatScreen] Screen unfocused, stopping polling');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }, [user, loadConversationsFromStorage])
  );

  useEffect(() => {
    // Initialize chat service when screen loads
    const initializeChat = async () => {
      if (!user) {
        setIsInitialLoading(false);
        firstLoadCompletedRef.current = true;
        return;
      }

      const connected = await chatService.init();
      setIsConnected(connected);

      // Load conversations from AsyncStorage - use initial loading type
      await loadConversationsFromStorage('initial');
    };

    initializeChat();

    return () => {
      // Clean up polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Clear any pending timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, [user, loadConversationsFromStorage]);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
  };

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Chat</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please log in to access chat</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        {isConnected && (
          <View style={styles.connectionStatus}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        )}
      </View>

      {isUpdating && (
        <View style={styles.updateIndicator}>
          <ActivityIndicator size="small" color="#1976D2" style={styles.updateSpinner} />
        </View>
      )}

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Start chatting with other pilgrims on the map!
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <Link 
              href={{
                pathname: "/conversation/[id]",
                params: { id: item.userId, name: item.name }
              }}
              asChild
            >
              <TouchableOpacity 
                style={styles.conversationItem}
              >
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.conversationDetails}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.conversationName}>{item.name}</Text>
                    <Text style={styles.conversationTime}>
                      {formatTime(item.timestamp)}
                    </Text>
                  </View>
                  
                  <View style={styles.conversationFooter}>
                    <Text 
                      style={styles.conversationMessage}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.lastMessage}
                    </Text>
                    
                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>
                          {item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Link>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  connectedText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    flexGrow: 1,
    padding: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  conversationDetails: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  updateIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    zIndex: 10,
    opacity: 0.7,
  },
  updateSpinner: {
    transform: [{ scale: 0.6 }],
  },
}); 