import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import socketService from './socketService';

// Keys for AsyncStorage
const MESSAGES_STORAGE_KEY = 'chat_messages';
const CONVERSATIONS_STORAGE_KEY = 'chat_conversations';

export interface ChatMessage {
  messageId: string;
  senderId: string;
  recipientId: string;
  message: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'seen' | 'failed';
}

export interface MessageStatus {
  messageId: string;
  status: string;
}

export interface MessageSeen {
  messageId: string;
  seenBy: string;
}

export interface ChatUser {
  id: string;
  name: string;
  enableDms: boolean;
}

export interface Conversation {
  userId: string;
  name: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount: number;
}

class ChatService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private isAuthenticated: boolean = false;
  private currentUserId: string | null = null;
  
  // Callbacks for events
  private onNewMessage: ((message: ChatMessage) => void) | null = null;
  private onMessageStatus: ((status: MessageStatus) => void) | null = null;
  private onMessageSeen: ((data: MessageSeen) => void) | null = null;
  private onConnectionChange: ((connected: boolean) => void) | null = null;

  // Array to hold cleanup functions
  private _cleanupFunctions: (() => void)[] = [];

  /**
   * Initialize the chat service and connect to the server
   */
  public async init(): Promise<boolean> {
    try {
      console.log('[ChatService] Initializing chat service');
      
      // Check if socketService already has an active connection
      const socketInfo = socketService.getDebugInfo();
      if (socketInfo.connected) {
        console.log('[ChatService] Using existing socket connection from socketService');
        this.isConnected = true;
        this.isAuthenticated = socketInfo.authenticated;
        
        // Get current user ID
        const authData = socketService.getAuthData();
        if (authData) {
          this.currentUserId = authData.userId;
          console.log(`[ChatService] Got current user ID: ${this.currentUserId}`);
        } else {
          console.warn('[ChatService] No auth data found in socketService, trying alternative sources');
          await this.retrieveUserIdFromStorage();
        }
        
        // Try to access the existing socket instance from socketService
        // This won't work without modifying socketService to expose its socket
        // TODO: Add getSocket method to socketService
        
        // Set up our event listeners on the existing socket connection
        this.setupEventListenersOnExistingSocket();
        
        return true;
      }
      
      // Clean up existing socket
      this.disconnect();
      
      // Get the authentication token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('[ChatService] No token available, cannot initialize chat');
        return false;
      }
      
      // Try to get user ID before connecting
      if (!this.currentUserId) {
        await this.retrieveUserIdFromStorage();
      }
      
      // Connect with authentication
      this.socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        path: '/socket.io' // Adjust if your server uses a different path
      });
      
      this.setupEventListeners();
      
      // Wait for connection
      const connected = await new Promise<boolean>((resolve) => {
        if (!this.socket) {
          resolve(false);
          return;
        }
        
        // Set timeout for connection attempt
        const timeout = setTimeout(() => resolve(false), 10000);
        
        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve(true);
        });
        
        this.socket.once('connect_error', (error) => {
          console.error('[ChatService] Socket connection error:', error);
          clearTimeout(timeout);
          resolve(false);
        });
      });
      
      this.isConnected = connected;
      console.log(`[ChatService] Socket ${connected ? 'connected' : 'failed to connect'}`);
      
      if (this.onConnectionChange) {
        this.onConnectionChange(connected);
      }
      
      // Try to get the user ID if we're connected
      if (connected && !this.currentUserId) {
        const authData = socketService.getAuthData();
        if (authData) {
          this.currentUserId = authData.userId;
          console.log(`[ChatService] Got current user ID: ${this.currentUserId}`);
        }
      }
      
      return connected;
    } catch (error) {
      console.error('[ChatService] Error initializing chat service:', error);
      return false;
    }
  }
  
  /**
   * Helper to retrieve user ID from different storage sources
   */
  private async retrieveUserIdFromStorage(): Promise<void> {
    // Try to get from userData in AsyncStorage first
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        if (parsedUserData.id) {
          this.currentUserId = parsedUserData.id;
          console.log('[ChatService] Retrieved user ID from userData:', this.currentUserId);
          return;
        }
      }
    } catch (error) {
      console.error('[ChatService] Error retrieving userData from AsyncStorage:', error);
    }
    
    // If that fails, try to get a token-based ID
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // Create a temporary ID from the token
        this.currentUserId = `temp_${token.substring(0, 8)}`;
        console.log('[ChatService] Created temporary ID from token:', this.currentUserId);
      }
    } catch (error) {
      console.error('[ChatService] Error retrieving token from AsyncStorage:', error);
    }
  }
  
  /**
   * Set up event listeners on an existing socket, assuming socketService has the socket
   */
  private setupEventListenersOnExistingSocket(): void {
    // Instead of creating our own socket, we'll use socketService's socket through its helper methods
    console.log('[ChatService] Setting up event listeners through socketService');
    
    // Add listeners for chat events
    const newMessageCleanup = socketService.addEventListener('new_message', async (message: ChatMessage) => {
      console.log('[ChatService] New message received through socketService:', message);
      
      // Store message in AsyncStorage
      await this.storeMessage(message);
      
      // Update conversations
      await this.updateConversation(message);
      
      // Ensure we notify listeners
      if (this.onNewMessage) {
        console.log('[ChatService] Calling onNewMessage callback');
        this.onNewMessage(message);
      }
      
      // Automatically mark as delivered
      socketService.emitEvent('message_delivered', {
        messageId: message.messageId,
        senderId: message.senderId
      });
    });
    
    const messageStatusCleanup = socketService.addEventListener('message_status', async (status: MessageStatus) => {
      console.log('[ChatService] Message status update through socketService:', status);
      
      // Update message status in AsyncStorage
      await this.updateMessageStatus(status.messageId, status.status);
      
      if (this.onMessageStatus) {
        this.onMessageStatus(status);
      }
    });
    
    const messageSeenCleanup = socketService.addEventListener('message_seen', async (data: MessageSeen) => {
      console.log('[ChatService] Message seen through socketService:', data);
      
      // Update message status in AsyncStorage
      await this.updateMessageStatus(data.messageId, 'seen');
      
      if (this.onMessageSeen) {
        this.onMessageSeen(data);
      }
    });
    
    // Force refresh the connection status periodically
    const checkConnectionStatusInterval = setInterval(() => {
      const socketInfo = socketService.getDebugInfo();
      const wasConnected = this.isConnected;
      this.isConnected = socketInfo.connected;
      
      if (wasConnected !== this.isConnected) {
        console.log(`[ChatService] Connection status changed to: ${this.isConnected}`);
        if (this.onConnectionChange) {
          this.onConnectionChange(this.isConnected);
        }
      }
    }, 5000);
    
    // Clean up in disconnect
    this._cleanupFunctions.push(() => {
      clearInterval(checkConnectionStatusInterval);
      newMessageCleanup();
      messageStatusCleanup();
      messageSeenCleanup();
    });
  }
  
  /**
   * Set up socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('[ChatService] Socket connected');
      this.isConnected = true;
      if (this.onConnectionChange) {
        this.onConnectionChange(true);
      }
    });
    
    this.socket.on('disconnect', () => {
      console.log('[ChatService] Socket disconnected');
      this.isConnected = false;
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }
    });
    
    // Chat events
    this.socket.on('new_message', async (message: ChatMessage) => {
      console.log('[ChatService] New message received:', message);
      
      // Store message in AsyncStorage
      await this.storeMessage(message);
      
      // Update conversations
      await this.updateConversation(message);
      
      // Ensure we notify listeners - this is critical for real-time updates
      if (this.onNewMessage) {
        console.log('[ChatService] Calling onNewMessage callback');
        this.onNewMessage(message);
      } else {
        console.log('[ChatService] No onNewMessage callback registered');
      }
      
      // Automatically mark as delivered
      this.socket?.emit('message_delivered', {
        messageId: message.messageId,
        senderId: message.senderId
      });
    });
    
    this.socket.on('message_status', async (status: MessageStatus) => {
      console.log('[ChatService] Message status update:', status);
      
      // Update message status in AsyncStorage
      await this.updateMessageStatus(status.messageId, status.status);
      
      if (this.onMessageStatus) {
        this.onMessageStatus(status);
      }
    });
    
    this.socket.on('message_seen', async (data: MessageSeen) => {
      console.log('[ChatService] Message seen:', data);
      
      // Update message status in AsyncStorage
      await this.updateMessageStatus(data.messageId, 'seen');
      
      if (this.onMessageSeen) {
        this.onMessageSeen(data);
      }
    });
  }
  
  /**
   * Store a message in AsyncStorage
   */
  private async storeMessage(message: ChatMessage): Promise<void> {
    try {
      // Get existing messages
      const storedMessagesString = await AsyncStorage.getItem(MESSAGES_STORAGE_KEY);
      const storedMessages: Record<string, ChatMessage[]> = storedMessagesString 
        ? JSON.parse(storedMessagesString) 
        : {};
      
      // Create a key for this conversation (we store messages for each conversation separately)
      const conversationId = this.getConversationId(message.senderId, message.recipientId);
      
      // Add message to conversation
      if (!storedMessages[conversationId]) {
        storedMessages[conversationId] = [];
      }
      
      // Check if we already have this message (by ID)
      const existingMessageIndex = storedMessages[conversationId].findIndex(
        msg => msg.messageId === message.messageId
      );
      
      if (existingMessageIndex >= 0) {
        // Update existing message
        storedMessages[conversationId][existingMessageIndex] = message;
      } else {
        // Add new message
        storedMessages[conversationId].push(message);
      }
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(storedMessages));
      
    } catch (error) {
      console.error('[ChatService] Error storing message:', error);
    }
  }
  
  /**
   * Update message status in AsyncStorage
   */
  private async updateMessageStatus(messageId: string, status: string): Promise<void> {
    try {
      // Get existing messages
      const storedMessagesString = await AsyncStorage.getItem(MESSAGES_STORAGE_KEY);
      if (!storedMessagesString) return;
      
      const storedMessages: Record<string, ChatMessage[]> = JSON.parse(storedMessagesString);
      
      // Look through all conversations for this message
      for (const conversationId in storedMessages) {
        const messages = storedMessages[conversationId];
        const messageIndex = messages.findIndex(msg => msg.messageId === messageId);
        
        if (messageIndex >= 0) {
          // Update message status
          messages[messageIndex].status = status as any;
          
          // Save back to AsyncStorage
          await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(storedMessages));
          return;
        }
      }
    } catch (error) {
      console.error('[ChatService] Error updating message status:', error);
    }
  }
  
  /**
   * Update conversation metadata in AsyncStorage
   */
  private async updateConversation(message: ChatMessage): Promise<void> {
    try {
      // Determine if current user is sender or recipient
      let otherUserId: string;
      let isIncoming = false;
      
      if (message.senderId === this.currentUserId) {
        otherUserId = message.recipientId;
      } else {
        otherUserId = message.senderId;
        isIncoming = true;
      }
      
      // Get existing conversations
      const storedConversationsString = await AsyncStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      const storedConversations: Record<string, Conversation> = storedConversationsString 
        ? JSON.parse(storedConversationsString) 
        : {};
      
      // Update or create conversation
      if (storedConversations[otherUserId]) {
        // Update existing conversation
        storedConversations[otherUserId].lastMessage = message.message;
        storedConversations[otherUserId].timestamp = message.timestamp;
        
        // Increment unread count for incoming messages
        if (isIncoming) {
          storedConversations[otherUserId].unreadCount += 1;
        }
      } else {
        // Create new conversation (need to get user info from somewhere)
        // For now, just use the ID as the name
        storedConversations[otherUserId] = {
          userId: otherUserId,
          name: `User ${otherUserId}`,
          lastMessage: message.message,
          timestamp: message.timestamp,
          unreadCount: isIncoming ? 1 : 0
        };
      }
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(storedConversations));
      
    } catch (error) {
      console.error('[ChatService] Error updating conversation:', error);
    }
  }
  
  /**
   * Get a unique ID for a conversation between two users
   */
  private getConversationId(user1: string, user2: string): string {
    // Sort IDs to ensure consistency regardless of who is sender/recipient
    const sortedIds = [user1, user2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }
  
  /**
   * Reset unread count for a conversation
   */
  public async markConversationAsRead(userId: string): Promise<void> {
    try {
      // Get existing conversations
      const storedConversationsString = await AsyncStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      if (!storedConversationsString) return;
      
      const storedConversations: Record<string, Conversation> = JSON.parse(storedConversationsString);
      
      if (storedConversations[userId]) {
        storedConversations[userId].unreadCount = 0;
        
        // Save back to AsyncStorage
        await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(storedConversations));
      }
    } catch (error) {
      console.error('[ChatService] Error marking conversation as read:', error);
    }
  }
  
  /**
   * Initialize a chat with a user
   */
  public async initChat(userId: string): Promise<{
    success: boolean;
    user?: ChatUser;
    error?: string;
  }> {
    try {
      // Mark conversation as read
      await this.markConversationAsRead(userId);
      
      // In a real backend, we'd check if this user accepts messages
      // For now, we'll just return success
      return { 
        success: true, 
        user: {
          id: userId,
          name: `User ${userId}`,
          enableDms: true
        }
      };
    } catch (error) {
      console.error('[ChatService] Error initializing chat:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error initializing chat'
      };
    }
  }
  
  /**
   * Get the list of conversations for the current user
   */
  public async getConversations(): Promise<{
    success: boolean;
    conversations?: Conversation[];
    error?: string;
  }> {
    try {
      // Get conversations from AsyncStorage
      const storedConversationsString = await AsyncStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      
      if (!storedConversationsString) {
        return { success: true, conversations: [] };
      }
      
      const storedConversations: Record<string, Conversation> = JSON.parse(storedConversationsString);
      
      // Convert to array and sort by timestamp (most recent first)
      const conversations = Object.values(storedConversations).sort((a, b) => {
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      
      return { success: true, conversations };
    } catch (error) {
      console.error('[ChatService] Error getting conversations:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error fetching conversations'
      };
    }
  }
  
  /**
   * Get message history for a conversation
   */
  public async getMessageHistory(userId: string): Promise<{
    success: boolean;
    messages?: ChatMessage[];
    error?: string;
  }> {
    try {
      if (!this.currentUserId) {
        // First try to get from socketService
        const authData = socketService.getAuthData();
        if (authData) {
          this.currentUserId = authData.userId;
        } else {
          // Try to get user ID directly from AsyncStorage
          try {
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
              const parsedUserData = JSON.parse(userData);
              if (parsedUserData.id) {
                this.currentUserId = parsedUserData.id;
                console.log('[ChatService] Retrieved user ID from AsyncStorage:', this.currentUserId);
              }
            }
          } catch (storageError) {
            console.error('[ChatService] Error getting user data from AsyncStorage:', storageError);
          }
          
          // If still no user ID, check the token for user info
          if (!this.currentUserId) {
            const token = await AsyncStorage.getItem('token');
            if (token) {
              // Token exists, so user is authenticated even if we can't get the ID
              console.log('[ChatService] User has valid token but ID is unavailable');
              // As a last resort, create a temporary ID from the token
              this.currentUserId = `temp_${token.substring(0, 8)}`;
            } else {
              return { success: false, error: 'Current user not authenticated' };
            }
          }
        }
      }
      
      // Create conversation ID
      const conversationId = this.getConversationId(this.currentUserId, userId);
      
      // Get messages from AsyncStorage
      const storedMessagesString = await AsyncStorage.getItem(MESSAGES_STORAGE_KEY);
      
      if (!storedMessagesString) {
        return { success: true, messages: [] };
      }
      
      const storedMessages: Record<string, ChatMessage[]> = JSON.parse(storedMessagesString);
      
      // Get messages for this conversation
      const messages = storedMessages[conversationId] || [];
      
      // Sort by timestamp
      const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
      
      return { success: true, messages: sortedMessages };
    } catch (error) {
      console.error('[ChatService] Error getting message history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error fetching message history'
      };
    }
  }
  
  /**
   * Send a message to a user
   */
  public async sendMessage(recipientId: string, message: string): Promise<string> {
    // Check if we're using socketService's connection or our own
    if (!this.socket) {
      // Try to use socketService directly
      const socketInfo = socketService.getDebugInfo();
      if (!socketInfo.connected) {
        console.error('[ChatService] Cannot send message: no socket connection available');
        throw new Error('Socket not connected');
      }
    }
    
    // Ensure we have currentUserId
    if (!this.currentUserId) {
      const authData = socketService.getAuthData();
      if (authData) {
        this.currentUserId = authData.userId;
      } else {
        // Try to retrieve from storage
        await this.retrieveUserIdFromStorage();
        
        // If still no user ID, throw an error
        if (!this.currentUserId) {
          throw new Error('Current user not authenticated');
        }
      }
    }
    
    const messageId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create message object
    const newMessage: ChatMessage = {
      messageId,
      senderId: this.currentUserId,
      recipientId,
      message,
      timestamp: Date.now(),
      status: 'sent'
    };
    
    // Store locally first
    await this.storeMessage(newMessage);
    
    // Update conversation
    await this.updateConversation(newMessage);
    
    // Send via socket - try both our socket and socketService
    let sentSuccessfully = false;
    
    if (this.socket) {
      try {
        this.socket.emit('send_message', {
          recipientId,
          message,
          messageId
        });
        sentSuccessfully = true;
        console.log('[ChatService] Message sent through chatService socket');
      } catch (error) {
        console.error('[ChatService] Error sending through our socket:', error);
      }
    }
    
    if (!sentSuccessfully) {
      // Try through socketService
      const sent = socketService.emitEvent('send_message', {
        recipientId,
        message,
        messageId
      });
      
      if (sent) {
        console.log('[ChatService] Message sent through socketService');
        sentSuccessfully = true;
      } else {
        console.warn('[ChatService] Failed to send through socketService, but message is stored locally');
        // Update the message status to indicate it's stored locally but not sent
        await this.updateMessageStatus(messageId, 'failed');
      }
    }
    
    return messageId;
  }
  
  /**
   * Mark a message as seen
   */
  public async markMessageAsSeen(messageId: string, senderId: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      console.log('[ChatService] Cannot mark message as seen: socket not connected');
      return;
    }
    
    // Update locally first
    await this.updateMessageStatus(messageId, 'seen');
    
    // Send to server
    this.socket.emit('message_seen', {
      messageId,
      senderId
    });
  }
  
  /**
   * Set callback for new messages
   */
  public setOnNewMessage(callback: (message: ChatMessage) => void): void {
    this.onNewMessage = callback;
  }
  
  /**
   * Set callback for message status updates
   */
  public setOnMessageStatus(callback: (status: MessageStatus) => void): void {
    this.onMessageStatus = callback;
  }
  
  /**
   * Set callback for message seen events
   */
  public setOnMessageSeen(callback: (data: MessageSeen) => void): void {
    this.onMessageSeen = callback;
  }
  
  /**
   * Set callback for connection status changes
   */
  public setOnConnectionChange(callback: (connected: boolean) => void): void {
    this.onConnectionChange = callback;
  }
  
  /**
   * Disconnect the socket
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    
    // Run all cleanup functions
    this._cleanupFunctions.forEach(cleanup => cleanup());
    this._cleanupFunctions = [];
  }
  
  /**
   * Check if socket is connected
   */
  public isSocketConnected(): boolean {
    return this.isConnected;
  }
  
  /**
   * Clear all chat data (for testing/debugging)
   */
  public async clearAllChatData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MESSAGES_STORAGE_KEY);
      await AsyncStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
      console.log('[ChatService] All chat data cleared');
    } catch (error) {
      console.error('[ChatService] Error clearing chat data:', error);
    }
  }
}

// Create and export singleton instance
export const chatService = new ChatService();
export default chatService; 