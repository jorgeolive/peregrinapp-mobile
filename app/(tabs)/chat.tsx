import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Link } from 'expo-router';
import chatService from '../services/chatService';

interface Conversation {
  userId: string;
  name: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount: number;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize chat service when screen loads
    const initializeChat = async () => {
      setIsLoading(true);
      if (!user) {
        setIsLoading(false);
        return;
      }

      const connected = await chatService.init();
      setIsConnected(connected);

      // Fetch real conversations from API
      try {
        const result = await chatService.getConversations();
        if (result.success && result.conversations) {
          console.log('[ChatScreen] Fetched conversations:', result.conversations);
          setConversations(result.conversations);
        } else {
          console.error('[ChatScreen] Failed to fetch conversations:', result.error);
          // Fall back to dummy data if API fails
          setConversations([
            {
              userId: '1',
              name: 'Juan Peregrino',
              lastMessage: 'Hola, ¿dónde estás en el Camino?',
              timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
              unreadCount: 2
            },
            {
              userId: '2',
              name: 'Maria Caminante',
              lastMessage: 'El albergue estaba genial, gracias!',
              timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
              unreadCount: 0
            }
          ]);
        }
      } catch (error) {
        console.error('[ChatScreen] Error fetching conversations:', error);
        // Use dummy data as fallback
        setConversations([
          {
            userId: '1',
            name: 'Juan Peregrino',
            lastMessage: 'Hola, ¿dónde estás en el Camino?',
            timestamp: Date.now() - 1000 * 60 * 5,
            unreadCount: 2
          },
          {
            userId: '2',
            name: 'Maria Caminante',
            lastMessage: 'El albergue estaba genial, gracias!',
            timestamp: Date.now() - 1000 * 60 * 60 * 2,
            unreadCount: 0
          }
        ]);
      }

      setIsLoading(false);
    };

    // Set up event listeners for new messages
    chatService.setOnNewMessage((message) => {
      // Update conversations when new message arrives
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c.userId === message.senderId);
        if (existingIndex >= 0) {
          // Update existing conversation
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message.message,
            timestamp: message.timestamp,
            unreadCount: updated[existingIndex].unreadCount + 1
          };
          return updated;
        } else {
          // TODO: Fetch user info from API using message.senderId
          // For now, create a placeholder
          return [{
            userId: message.senderId,
            name: `User ${message.senderId}`,
            lastMessage: message.message,
            timestamp: message.timestamp,
            unreadCount: 1
          }, ...prev];
        }
      });
    });

    // Set connection status listener
    chatService.setOnConnectionChange(setIsConnected);

    initializeChat();

    return () => {
      // No need to disconnect on unmount
      // The socket should persist between tabs
    };
  }, [user]);

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

  if (isLoading) {
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
    color: '#888',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    paddingRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#FF5722',
    borderRadius: 12,
    height: 22,
    minWidth: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 