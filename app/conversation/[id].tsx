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
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import chatService, { ChatMessage } from '../services/chatService';
import { useAuth } from '../context/AuthContext';

export default function ConversationScreen() {
  const { user } = useAuth();
  const { id: recipientId, name: recipientName } = useLocalSearchParams<{ id: string, name: string }>();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Function to load message history from AsyncStorage
  const loadMessageHistory = async () => {
    try {
      if (!recipientId) return;
      
      console.log(`[ConversationScreen] Loading message history for conversation with ${recipientId}`);
      const result = await chatService.getMessageHistory(recipientId);
      
      if (result.success && result.messages) {
        console.log(`[ConversationScreen] Loaded ${result.messages.length} messages from history`);
        setMessages(result.messages);
      } else {
        console.error('[ConversationScreen] Failed to load message history:', result.error);
      }
    } catch (error) {
      console.error('[ConversationScreen] Error loading message history:', error);
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        
        // Make sure the chat service is initialized
        if (!chatService.isSocketConnected()) {
          const connected = await chatService.init();
          setIsConnected(connected);
          if (!connected) {
            console.log('[ConversationScreen] Failed to connect to chat service');
            setIsLoading(false);
            return;
          }
        } else {
          setIsConnected(true);
        }
        
        // Initialize chat with recipient
        if (recipientId) {
          const result = await chatService.initChat(recipientId);
          if (result.success) {
            console.log('[ConversationScreen] Chat initialized with user:', result.user);
            setIsInitialized(true);
          } else {
            console.error('[ConversationScreen] Failed to initialize chat:', result.error);
          }
        }
        
        // Fetch real message history
        await loadMessageHistory();
        
      } catch (error) {
        console.error('[ConversationScreen] Error initializing chat:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Set up message listeners
    const newMessageHandler = (newMessage: ChatMessage) => {
      console.log('[ConversationScreen] New message received:', newMessage);
      
      // Check if this message belongs to the current conversation
      if (
        (String(newMessage.senderId) === String(recipientId) && String(newMessage.recipientId) === String(user?.id)) || 
        (String(newMessage.recipientId) === String(recipientId) && String(newMessage.senderId) === String(user?.id))
      ) {
        console.log('[ConversationScreen] Message belongs to this conversation, updating UI');
        
        // Add to messages state to ensure UI updates
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const existingIndex = prev.findIndex(msg => msg.messageId === newMessage.messageId);
          if (existingIndex >= 0) {
            // Update existing message (e.g., status change)
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              status: newMessage.status // Update status
            };
            return updated;
          }
          return [...prev, newMessage];
        });
        
        // Mark message as seen if we received it
        if (String(newMessage.senderId) === String(recipientId)) {
          chatService.markMessageAsSeen(newMessage.messageId, newMessage.senderId);
        }
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.log(`[ConversationScreen] Message does not belong to this conversation (current: ${recipientId}, got: ${newMessage.senderId}/${newMessage.recipientId})`);
      }
    };
    
    // Handle message status updates
    const messageStatusHandler = (status: { messageId: string, status: string }) => {
      console.log('[ConversationScreen] Message status update:', status);
      setMessages(prev => {
        const existingIndex = prev.findIndex(msg => msg.messageId === status.messageId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            status: status.status as any
          };
          return updated;
        }
        return prev;
      });
    };
    
    // Handle message seen events
    const messageSeenHandler = (data: { messageId: string }) => {
      console.log('[ConversationScreen] Message seen:', data);
      setMessages(prev => {
        const existingIndex = prev.findIndex(msg => msg.messageId === data.messageId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            status: 'seen'
          };
          return updated;
        }
        return prev;
      });
    };
    
    chatService.setOnNewMessage(newMessageHandler);
    chatService.setOnMessageStatus(messageStatusHandler);
    chatService.setOnMessageSeen(messageSeenHandler);
    chatService.setOnConnectionChange(setIsConnected);
    
    initializeChat();
    
    // Cleanup
    return () => {
      // We don't disconnect, just remove message handlers for this conversation
      chatService.setOnNewMessage(() => {}); // Empty function instead of null
      chatService.setOnMessageStatus(() => {});
      chatService.setOnMessageSeen(() => {});
    };
  }, [recipientId, user?.id]);
  
  const handleSendMessage = async () => {
    if (!message.trim() || !isConnected || !isInitialized || !recipientId || !user) {
      return;
    }
    
    try {
      const trimmedMessage = message.trim();
      const messageId = await chatService.sendMessage(recipientId, trimmedMessage);
      
      // Add the message to the UI immediately without waiting for the socket event
      const newMessage: ChatMessage = {
        messageId,
        senderId: String(user.id),
        recipientId: String(recipientId),
        message: trimmedMessage,
        timestamp: Date.now(),
        status: 'sent'
      };
      
      // Update messages state
      setMessages(prev => [...prev, newMessage]);
      
      // Message is already stored in AsyncStorage by chatService, so we just need to clear the input
      setMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('[ConversationScreen] Error sending message:', error);
      // TODO: Show error to user
    }
  };
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const isMyMessage = (senderId: string) => {
    return String(senderId) === String(user?.id);
  };
  
  const renderMessageStatus = (status: string) => {
    if (status === 'sent') {
      return <Ionicons name="checkmark" size={16} color="#999" />;
    } else if (status === 'delivered') {
      return <Ionicons name="checkmark-done" size={16} color="#999" />;
    } else if (status === 'seen') {
      return <Ionicons name="checkmark-done" size={16} color="#1976D2" />;
    }
    return null;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMessageHistory();
    } catch (error) {
      console.error('[ConversationScreen] Error refreshing messages:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadMessageHistory]);

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
        {isLoading ? (
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
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.messageId}
              contentContainerStyle={styles.messagesContainer}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  colors={['#1976D2']}
                  tintColor="#1976D2"
                />
              }
              onLayout={() => {
                flatListRef.current?.scrollToEnd({ animated: false });
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
}); 