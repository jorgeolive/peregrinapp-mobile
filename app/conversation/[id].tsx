import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, Stack, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import chatService, { ChatMessage } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for AsyncStorage
const MESSAGES_KEY = 'chat_messages';

export default function ConversationScreen() {
  const { user } = useAuth();
  const { id: recipientId, name: recipientName } = useLocalSearchParams<{ id: string, name: string }>();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Only for first load
  const [isRefreshing, setIsRefreshing] = useState(false); // For pull-to-refresh
  const [isUpdating, setIsUpdating] = useState(false); // For background updates
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const firstLoadCompletedRef = useRef(false);

  // Function to load message history directly from AsyncStorage
  const loadMessagesFromStorage = useCallback(async (loadType: 'initial' | 'refresh' | 'background' = 'background') => {
    try {
      if (!recipientId || !user?.id) {
        // Clear loading states if we can't proceed
        if (loadType === 'initial') {
          setIsInitialLoading(false);
          firstLoadCompletedRef.current = true;
        }
        else if (loadType === 'refresh') setIsRefreshing(false);
        else if (loadType === 'background') setIsUpdating(false);
        return;
      }
      
      // Only set loading indicators based on the type of load
      if (loadType === 'initial') setIsInitialLoading(true);
      else if (loadType === 'refresh') setIsRefreshing(true);
      else if (loadType === 'background') setIsUpdating(true);
      
      console.log(`[ConversationScreen] Loading messages from AsyncStorage (${loadType}) for conversation with ${recipientId}`);
      
      // Get the conversation ID using the same logic as in chatService
      const currentId = String(user.id);
      const otherUserId = String(recipientId);
      
      // Sort IDs to create consistent conversation ID
      const sortedIds = [currentId, otherUserId].sort();
      const conversationId = `${sortedIds[0]}_${sortedIds[1]}`;
      
      console.log(`[ConversationScreen] Using conversation ID: ${conversationId}`);
      
      // Get messages from AsyncStorage
      const messagesJSON = await AsyncStorage.getItem(MESSAGES_KEY);
      
      if (!messagesJSON) {
        console.log('[ConversationScreen] No messages found in AsyncStorage');
        
        // Empty messages array but don't reload if already empty
        if (messages.length !== 0) {
          setMessages([]);
        }
        
        // Clear loading states
        if (loadType === 'initial') {
          setIsInitialLoading(false);
          firstLoadCompletedRef.current = true;
        }
        else if (loadType === 'refresh') setIsRefreshing(false);
        else if (loadType === 'background') setIsUpdating(false);
        
        // Mark conversation as read even if empty
        await chatService.markConversationAsRead(otherUserId);
        
        return;
      }
      
      try {
        const storedMessages: Record<string, ChatMessage[]> = JSON.parse(messagesJSON);
        
        // Get messages for this conversation
        const conversationMessages = storedMessages[conversationId] || [];
        
        console.log(`[ConversationScreen] Found ${conversationMessages.length} messages in AsyncStorage for conversation ${conversationId}`);
        
        // If there are no messages, clear the messages array if not already empty
        if (conversationMessages.length === 0) {
          if (messages.length !== 0) {
            setMessages([]);
          }
          
          // Clear loading states immediately for empty conversations
          if (loadType === 'initial') {
            setIsInitialLoading(false);
            firstLoadCompletedRef.current = true; 
          }
          else if (loadType === 'refresh') setIsRefreshing(false);
          else if (loadType === 'background') setIsUpdating(false);
          
          // Mark conversation as read even if empty
          await chatService.markConversationAsRead(otherUserId);
          
          return;
        }
        
        // Show message IDs for debugging
        if (conversationMessages.length > 0) {
          console.log('[ConversationScreen] Message IDs:', conversationMessages.map(m => m.messageId).join(', '));
        }
        
        // Sort by timestamp (oldest first)
        const sortedMessages = [...conversationMessages].sort((a, b) => a.timestamp - b.timestamp);
        
        // Mark conversation as read
        await chatService.markConversationAsRead(otherUserId);
        
        // Auto-mark messages from the other user as seen
        for (const msg of sortedMessages) {
          // If this is a message from the other user and not already seen
          if (String(msg.senderId) === otherUserId && msg.status !== 'seen') {
            chatService.markMessageAsSeen(msg.messageId, msg.senderId);
          }
        }
        
        // Check if messages changed before updating state to avoid unnecessary re-renders
        const didMessagesChange = JSON.stringify(sortedMessages) !== JSON.stringify(messages);
        
        if (didMessagesChange) {
          console.log(`[ConversationScreen] Messages changed, updating UI with ${sortedMessages.length} messages`);
          setMessages(sortedMessages);
          
          // Scroll to bottom after loading messages if they changed
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }
      } catch (parseError) {
        console.error('[ConversationScreen] Error parsing messages JSON:', parseError);
        console.log('[ConversationScreen] Raw JSON length:', messagesJSON.length);
        // Try to recover by resetting messages
        if (messages.length !== 0) {
          setMessages([]);
        }
      }
      
      // Clear loading states
      if (loadType === 'initial') {
        setIsInitialLoading(false);
        firstLoadCompletedRef.current = true;
      }
      else if (loadType === 'refresh') setIsRefreshing(false);
      else if (loadType === 'background') setIsUpdating(false);
      
    } catch (error) {
      console.error('[ConversationScreen] Error loading messages from AsyncStorage:', error);
      
      // Clear loading states even on error
      if (loadType === 'initial') {
        setIsInitialLoading(false);
        firstLoadCompletedRef.current = true;
      }
      else if (loadType === 'refresh') setIsRefreshing(false);
      else if (loadType === 'background') setIsUpdating(false);
    }
  }, [recipientId, user?.id, messages]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMessagesFromStorage('refresh');
    setRefreshing(false);
  }, [loadMessagesFromStorage]);

  // Add a focus handler to reload messages when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('[ConversationScreen] Screen focused, setting up polling');
      
      // Initialize connection if needed
      const initConnection = async () => {
        if (!chatService.isSocketConnected()) {
          console.log('[ConversationScreen] Socket reconnecting on focus');
          const connected = await chatService.init();
          setIsConnected(connected);
        } else {
          setIsConnected(true);
        }
        
        setIsInitialized(true);
      };
      
      initConnection();
      
      // Load messages immediately when returning to screen
      if (firstLoadCompletedRef.current) {
        // This isn't the first load, so don't show the full loading spinner
        loadMessagesFromStorage('background');
      }
      
      // Set up polling interval
      pollingIntervalRef.current = setInterval(() => {
        // Use background loading type for polling to avoid spinner
        loadMessagesFromStorage('background');
        
        // Also check connection status
        setIsConnected(chatService.isSocketConnected());
      }, 1000); // Poll every second
      
      return () => {
        // Clear polling interval when screen loses focus
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }, [loadMessagesFromStorage])
  );

  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log('[ConversationScreen] Starting chat initialization');
        
        // Always set initial loading to true at the start
        setIsInitialLoading(true);
        
        // Make sure the chat service is initialized
        if (!chatService.isSocketConnected()) {
          console.log('[ConversationScreen] Socket not connected, initializing now');
          const connected = await chatService.init();
          setIsConnected(connected);
          console.log(`[ConversationScreen] Socket initialization result: ${connected}`);
          if (!connected) {
            console.log('[ConversationScreen] Failed to connect to chat service');
            setIsInitialLoading(false);
            firstLoadCompletedRef.current = true;
            return;
          }
        } else {
          console.log('[ConversationScreen] Socket already connected');
          setIsConnected(true);
        }
        
        // Initialize chat with recipient
        if (recipientId) {
          console.log(`[ConversationScreen] Initializing chat with recipient: ${recipientId}`);
          await chatService.markConversationAsRead(recipientId);
        }
        
        // Load message history from AsyncStorage - use initial load type
        await loadMessagesFromStorage('initial');
        
        // Ensure these are set regardless of messages being found
        setIsInitialized(true);
        setIsInitialLoading(false);
        firstLoadCompletedRef.current = true;
      } catch (error) {
        console.error('[ConversationScreen] Error during initialization:', error);
        setIsInitialLoading(false);
        firstLoadCompletedRef.current = true;
        setIsInitialized(true); // Set initialized to true even on error to allow interaction
      }
    };
    
    initializeChat();
    
    return () => {
      // Clean up polling when component unmounts
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [recipientId, loadMessagesFromStorage]);

  const handleSendMessage = async () => {
    if (!message.trim() || !isConnected || !isInitialized || !recipientId || !user) {
      console.log(`[ConversationScreen] Cannot send message - conditions not met: 
        message: ${!!message.trim()}, 
        connected: ${isConnected}, 
        initialized: ${isInitialized}, 
        recipientId: ${!!recipientId}, 
        user: ${!!user}`);
      return;
    }
    
    // Clear input immediately for better UX
    const messageText = message;
    setMessage('');
    
    try {
      console.log(`[ConversationScreen] Sending message to ${recipientId}: "${messageText.substring(0, 20)}..."`);
      
      // Send the message through chat service
      await chatService.sendMessage(recipientId, messageText);
      
      // Immediately load messages to see our sent message - use background loading type
      await loadMessagesFromStorage('background');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('[ConversationScreen] Error sending message:', error);
      
      // Restore the message text if it failed
      setMessage(messageText);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (senderId: string) => {
    return user?.id && String(senderId) === String(user.id);
  };

  const renderMessageStatus = (status: string) => {
    if (status === 'sent') {
      return <Ionicons name="checkmark" size={14} color="#999" />;
    } else if (status === 'delivered') {
      return <Ionicons name="checkmark-done" size={14} color="#999" />;
    } else if (status === 'seen') {
      return <Ionicons name="checkmark-done" size={14} color="#2196F3" />;
    } else {
      return <Ionicons name="time-outline" size={14} color="#f44336" />;
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: recipientName || 'Chat',
          headerRight: () => (
            isConnected ? (
              <View style={styles.connectionStatus}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            ) : null
          )
        }} 
      />
      
      <SafeAreaView style={styles.container}>
        {isInitialLoading ? (
          // Only show full loading screen on initial load
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          >
            {isRefreshing && (
              <View style={styles.refreshIndicator}>
                <ActivityIndicator size="small" color="#1976D2" />
              </View>
            )}
            
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.messageId}
              contentContainerStyle={[
                styles.messagesContainer,
                messages.length === 0 && styles.emptyMessagesContainer
              ]}
              ListEmptyComponent={
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="chatbubble-ellipses-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyStateText}>No messages yet</Text>
                  <Text style={styles.emptyStateSubtext}>Send a message to start the conversation</Text>
                </View>
              }
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={handleRefresh}
                  colors={['#1976D2']}
                  tintColor="#1976D2"
                />
              }
              onLayout={() => {
                if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
              renderItem={({ item }) => {
                const isMine = isMyMessage(item.senderId);
                return (
                  <View style={[
                    styles.messageWrapper,
                    isMine ? styles.myMessageWrapper : styles.theirMessageWrapper
                  ]}>
                    <View style={[
                      styles.messageBubble,
                      isMine ? styles.myMessage : styles.theirMessage
                    ]}>
                      <Text style={styles.messageText}>{item.message}</Text>
                      <View style={styles.messageFooter}>
                        <Text style={styles.messageTime}>
                          {formatTime(item.timestamp)}
                        </Text>
                        {isMine && renderMessageStatus(item.status)}
                      </View>
                    </View>
                  </View>
                );
              }}
            />
            
            {isUpdating && (
              <View style={styles.updateIndicator}>
                <ActivityIndicator size="small" color="#1976D2" style={styles.updateSpinner} />
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!message.trim() || !isConnected) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!message.trim() || !isConnected}
              >
                <Ionicons name="send" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  myMessageWrapper: {
    justifyContent: 'flex-end',
  },
  theirMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    paddingBottom: 8,
  },
  myMessage: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
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
  refreshIndicator: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    height: 30,
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
  emptyMessagesContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
  },
}); 