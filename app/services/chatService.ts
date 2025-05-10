import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';

// Keys for AsyncStorage
const MESSAGES_KEY = 'chat_messages';
const CONVERSATIONS_KEY = 'chat_conversations';

// Interfaces
export interface ChatMessage {
  messageId: string;
  senderId: string;
  recipientId: string;
  message: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'seen' | 'failed';
}

export interface Conversation {
  userId: string;
  name: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount: number;
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

class ChatService {
  // Core state
  private socket: Socket | null = null;
  private userId: string | null = null;
  private isConnected: boolean = false;
  private token: string | null = null;
  private isReconnecting: boolean = false;
  
  // Connection management
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize chat service
   */
  public async init(): Promise<boolean> {
    console.log('[ChatService] Initializing');
    
    // Get the auth token
    try {
      this.token = await AsyncStorage.getItem('token');
      if (!this.token) {
        console.log('[ChatService] No token found, cannot connect');
        return false;
      }
    } catch (error) {
      console.error('[ChatService] Failed to get token', error);
      return false;
    }
    
    // Get user ID from storage
    await this.getUserId();
    
    // Connect to socket
    return this.connect();
  }
  
  /**
   * Establish socket connection
   */
  private async connect(): Promise<boolean> {
    if (this.socket) {
      console.log('[ChatService] Already connected, disconnecting first');
      this.disconnect();
    }
    
    try {
      console.log('[ChatService] Connecting to socket');
      this.isReconnecting = true;
      
      // Create socket connection
      this.socket = io(API_BASE_URL, {
        auth: { token: this.token },
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket', 'polling']
      });
      
      // Set up connection promise
      return new Promise((resolve) => {
        if (!this.socket) {
          this.isReconnecting = false;
          resolve(false);
          return;
        }
        
        // Handle successful connection
        this.socket.on('connect', () => {
          console.log('[ChatService] Socket connected');
          this.isConnected = true;
          this.isReconnecting = false;
          
          // Set up event listeners
          this.setupEventListeners();
          
          // Start connection check interval
          this.startConnectionCheck();
          
          resolve(true);
        });
        
        // Handle connection error
        this.socket.on('connect_error', (error) => {
          console.error('[ChatService] Connection error', error.message);
          this.isConnected = false;
          this.isReconnecting = false;
          
          resolve(false);
        });
        
        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            console.log('[ChatService] Connection timeout');
            this.isReconnecting = false;
            resolve(false);
          }
        }, 10000);
      });
    } catch (error) {
      console.error('[ChatService] Failed to connect', error);
      this.isReconnecting = false;
      return false;
    }
  }
  
  /**
   * Set up socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;
    
    // Handle incoming messages
    this.socket.on('new_message', async (message: any) => {
      console.log('[ChatService] New message received', message);
      
      // Ensure message has required fields
      if (!message || !message.messageId || !message.senderId || !message.recipientId) {
        console.error('[ChatService] Received invalid message', message);
        return;
      }
      
      // Normalize message (always use strings for IDs)
      const normalizedMessage: ChatMessage = {
        messageId: String(message.messageId),
        senderId: String(message.senderId),
        recipientId: String(message.recipientId),
        message: message.message,
        timestamp: message.timestamp || Date.now(),
        status: message.status || 'delivered'
      };
      
      // Store message
      await this.storeMessage(normalizedMessage);
      
      // Update conversation
      await this.updateConversation(normalizedMessage);
      
      // Mark as delivered
      this.markAsDelivered(normalizedMessage.messageId, normalizedMessage.senderId);
    });
    
    // Handle message status updates
    this.socket.on('message_status', async (status: any) => {
      console.log('[ChatService] Message status update', status);
      
      if (!status || !status.messageId) {
        console.error('[ChatService] Received invalid status update', status);
        return;
      }
      
      // Update message status in storage
      await this.updateMessageStatus(status.messageId, status.status);
    });
    
    // Handle message seen updates
    this.socket.on('message_seen', async (data: any) => {
      console.log('[ChatService] Message seen update', data);
      
      if (!data || !data.messageId) {
        console.error('[ChatService] Received invalid seen update', data);
        return;
      }
      
      // Update message status in storage
      await this.updateMessageStatus(data.messageId, 'seen');
    });
    
    // Handle disconnection
    this.socket.on('disconnect', () => {
      console.log('[ChatService] Socket disconnected');
      this.isConnected = false;
    });
  }
  
  /**
   * Mark a message as delivered
   */
  private markAsDelivered(messageId: string, senderId: string): void {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('message_delivered', {
      messageId,
      senderId
    }, (ack: any) => {
      if (!ack || !ack.success) {
        console.log(`[ChatService] Failed to confirm delivery for message ${messageId}: ${ack?.error || 'No acknowledgment'}`);
      }
    });
  }
  
  /**
   * Start connection check interval
   */
  private startConnectionCheck(): void {
    // Clear any existing interval
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    
    // Check connection status every 10 seconds
    this.connectionCheckInterval = setInterval(() => {
      const wasConnected = this.isConnected;
      this.isConnected = this.socket?.connected || false;
      
      // Only log on change if not reconnecting
      if (wasConnected !== this.isConnected && !this.isReconnecting) {
        console.log(`[ChatService] Connection status changed to: ${this.isConnected}`);
      }
    }, 5000);
  }
  
  /**
   * Get user ID from various sources
   */
  private async getUserId(): Promise<void> {
    if (this.userId) return;
    
    try {
      // Try to get from userData
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed.id) {
          this.userId = String(parsed.id);
          console.log('[ChatService] Got user ID from userData:', this.userId);
          return;
        }
      }
      
      // Fallback to token-based ID
      if (this.token) {
        this.userId = `temp_${this.token.substring(0, 8)}`;
        console.log('[ChatService] Using temporary ID from token:', this.userId);
      }
    } catch (error) {
      console.error('[ChatService] Failed to get user ID', error);
    }
  }
  
  /**
   * Store a message in AsyncStorage
   */
  private async storeMessage(message: ChatMessage): Promise<void> {
    try {
      // Get the conversation ID
      const conversationId = this.getConversationId(message.senderId, message.recipientId);
      
      // Add a small delay to prevent race conditions with multiple rapid updates
      // This is a simple fix to stagger updates slightly
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Get stored messages - fresh copy to avoid race conditions
      const messagesJSON = await AsyncStorage.getItem(MESSAGES_KEY);
      const messages: Record<string, ChatMessage[]> = messagesJSON ? JSON.parse(messagesJSON) : {};
      
      // Debug log
      console.log(`[ChatService] Storing message ${message.messageId} to conversation ${conversationId}. Current count: ${messages[conversationId]?.length || 0}`);
      
      // Initialize conversation array if needed
      if (!messages[conversationId]) {
        messages[conversationId] = [];
      }
      
      // Check if message already exists
      const existingIndex = messages[conversationId].findIndex(m => m.messageId === message.messageId);
      
      if (existingIndex >= 0) {
        // Update existing message
        const betterStatus = this.getBetterStatus(
          messages[conversationId][existingIndex].status,
          message.status
        );
        
        messages[conversationId][existingIndex] = {
          ...message,
          // Don't downgrade status
          status: betterStatus as 'sent' | 'delivered' | 'seen' | 'failed'
        };
        
        console.log(`[ChatService] Updated existing message ${message.messageId} with status ${betterStatus}`);
      } else {
        // Add new message
        messages[conversationId].push(message);
        console.log(`[ChatService] Added new message ${message.messageId}. New count: ${messages[conversationId].length}`);
      }
      
      // Save back to AsyncStorage with more detailed error handling
      try {
        const jsonToStore = JSON.stringify(messages);
        await AsyncStorage.setItem(MESSAGES_KEY, jsonToStore);
        console.log(`[ChatService] Successfully saved messages to AsyncStorage. Size: ${jsonToStore.length} bytes`);
      } catch (storageError) {
        console.error('[ChatService] Failed to save messages to AsyncStorage:', storageError);
        // Could implement retry logic here if needed
      }
    } catch (error) {
      console.error('[ChatService] Failed to store message', error);
    }
  }
  
  /**
   * Update message status
   */
  private async updateMessageStatus(messageId: string, newStatus: string): Promise<void> {
    try {
      // Get stored messages
      const messagesJSON = await AsyncStorage.getItem(MESSAGES_KEY);
      if (!messagesJSON) return;
      
      const messages: Record<string, ChatMessage[]> = JSON.parse(messagesJSON);
      
      // Validate the status is one of our allowed values
      let validStatus: 'sent' | 'delivered' | 'seen' | 'failed' = 'delivered';
      
      // Only accept valid statuses
      if (newStatus === 'sent' || newStatus === 'delivered' || 
          newStatus === 'seen' || newStatus === 'failed') {
        validStatus = newStatus;
      } else {
        console.warn(`[ChatService] Invalid status: ${newStatus}, defaulting to 'delivered'`);
      }
      
      // Search for message in all conversations
      for (const conversationId in messages) {
        const conversation = messages[conversationId];
        const messageIndex = conversation.findIndex(m => m.messageId === messageId);
        
        if (messageIndex >= 0) {
          // Found the message
          const message = conversation[messageIndex];
          
          // Don't downgrade status
          if (this.isStatusDowngrade(message.status, validStatus)) {
            return;
          }
          
          // Update status with valid status value
          messages[conversationId][messageIndex].status = validStatus;
          
          // Save back to AsyncStorage
          await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
          return;
        }
      }
    } catch (error) {
      console.error('[ChatService] Failed to update message status', error);
    }
  }
  
  /**
   * Update conversation metadata
   */
  private async updateConversation(message: ChatMessage): Promise<void> {
    try {
      // Determine the other user ID
      const otherUserId = this.userId === message.senderId ? 
        message.recipientId : message.senderId;
      
      // Check if this is an incoming message
      const isIncoming = this.userId !== message.senderId;
      
      // Get stored conversations
      const conversationsJSON = await AsyncStorage.getItem(CONVERSATIONS_KEY);
      const conversations: Record<string, Conversation> = conversationsJSON ? 
        JSON.parse(conversationsJSON) : {};
      
      if (conversations[otherUserId]) {
        // Update existing conversation
        conversations[otherUserId].lastMessage = message.message;
        conversations[otherUserId].timestamp = message.timestamp;
        
        // Increment unread count for incoming messages
        if (isIncoming) {
          conversations[otherUserId].unreadCount += 1;
        }
      } else {
        // Create new conversation
        const userName = await this.getUserName(otherUserId);
        
        conversations[otherUserId] = {
          userId: otherUserId,
          name: userName || `User ${otherUserId}`,
          lastMessage: message.message,
          timestamp: message.timestamp,
          unreadCount: isIncoming ? 1 : 0
        };
      }
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('[ChatService] Failed to update conversation', error);
    }
  }
  
  /**
   * Try to get user name from storage
   */
  private async getUserName(userId: string): Promise<string | null> {
    try {
      const userDataKey = `user_${userId}`;
      const userData = await AsyncStorage.getItem(userDataKey);
      
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.name || null;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Check if new status is a downgrade from current status
   */
  private isStatusDowngrade(currentStatus: string, newStatus: string): boolean {
    const statusRank = {
      'seen': 3,
      'delivered': 2,
      'sent': 1,
      'failed': 0
    };
    
    return (statusRank[currentStatus as keyof typeof statusRank] || 0) > 
           (statusRank[newStatus as keyof typeof statusRank] || 0);
  }
  
  /**
   * Get the better of two statuses
   */
  private getBetterStatus(status1: string, status2: string): string {
    return this.isStatusDowngrade(status1, status2) ? status1 : status2;
  }
  
  /**
   * Get a unique conversation ID for two users
   */
  private getConversationId(user1: string, user2: string): string {
    // Sort IDs to ensure consistency
    const sortedIds = [String(user1), String(user2)].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }
  
  /**
   * Get all conversations
   */
  public async getConversations(): Promise<{
    success: boolean;
    conversations?: Conversation[];
    error?: string;
  }> {
    try {
      const conversationsJSON = await AsyncStorage.getItem(CONVERSATIONS_KEY);
      
      if (!conversationsJSON) {
        return { success: true, conversations: [] };
      }
      
      const conversations: Record<string, Conversation> = JSON.parse(conversationsJSON);
      
      // Convert to array and sort by timestamp (newest first)
      const sortedConversations = Object.values(conversations).sort((a, b) => 
        (b.timestamp || 0) - (a.timestamp || 0)
      );
      
      return { success: true, conversations: sortedConversations };
    } catch (error) {
      console.error('[ChatService] Failed to get conversations', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error fetching conversations'
      };
    }
  }
  
  /**
   * Mark conversation as read
   */
  public async markConversationAsRead(userId: string): Promise<void> {
    try {
      const conversationsJSON = await AsyncStorage.getItem(CONVERSATIONS_KEY);
      
      if (!conversationsJSON) return;
      
      const conversations: Record<string, Conversation> = JSON.parse(conversationsJSON);
      
      if (conversations[userId]) {
        conversations[userId].unreadCount = 0;
        await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
      }
    } catch (error) {
      console.error('[ChatService] Failed to mark conversation as read', error);
    }
  }
  
  /**
   * Mark a message as seen
   */
  public async markMessageAsSeen(messageId: string, senderId: string): Promise<void> {
    // Update locally
    await this.updateMessageStatus(messageId, 'seen');
    
    // Notify server with acknowledgment
    if (this.socket && this.isConnected) {
      this.socket.emit('message_seen', {
        messageId,
        senderId
      }, (ack: any) => {
        if (!ack || !ack.success) {
          console.log(`[ChatService] Failed to confirm seen status for message ${messageId}: ${ack?.error || 'No acknowledgment'}`);
        }
      });
    }
  }
  
  /**
   * Send a message
   */
  public async sendMessage(recipientId: string, text: string): Promise<string> {
    // Make sure we have our user ID
    await this.getUserId();
    
    if (!this.userId) {
      throw new Error('User not authenticated');
    }
    
    // Check connection
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to chat server');
    }
    
    // Create message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create message object
    const message: ChatMessage = {
      messageId,
      senderId: String(this.userId),
      recipientId: String(recipientId),
      message: text,
      timestamp: Date.now(),
      status: 'sent'
    };
    
    // Store message locally first
    await this.storeMessage(message);
    
    // Update conversation
    await this.updateConversation(message);
    
    // Send to server with acknowledgment
    return new Promise((resolve, reject) => {
      // Set a timeout for the acknowledgment
      const ackTimeout = setTimeout(() => {
        console.log(`[ChatService] Acknowledgment timeout for message ${messageId}`);
        this.updateMessageStatus(messageId, 'failed')
          .catch(error => console.error('[ChatService] Error updating status:', error));
        resolve(messageId); // Still return the message ID even if ack failed
      }, 10000); // 10-second timeout
      
      this.socket!.emit('send_message', {
        recipientId,
        message: text,
        messageId
      }, async (ack: any) => {
        // Clear the timeout since we got a response
        clearTimeout(ackTimeout);
        
        if (ack && ack.success) {
          console.log(`[ChatService] Message ${messageId} acknowledged by server`);
          await this.updateMessageStatus(messageId, 'delivered');
          resolve(messageId);
        } else {
          console.error(`[ChatService] Message ${messageId} failed:`, ack?.error || 'Unknown error');
          await this.updateMessageStatus(messageId, 'failed');
          resolve(messageId); // Still return the message ID even if it failed
        }
      });
    });
  }
  
  /**
   * Check if connected
   */
  public isSocketConnected(): boolean {
    return this.isConnected;
  }
  
  /**
   * Get debugging info
   */
  public getDebugInfo(): any {
    return {
      connected: this.isConnected,
      userId: this.userId,
      isReconnecting: this.isReconnecting
    };
  }
  
  /**
   * Disconnect
   */
  public disconnect(): void {
    // Clear connection check interval
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
  }
  
  /**
   * Clear all chat data (for testing)
   */
  public async clearAllChatData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MESSAGES_KEY);
      await AsyncStorage.removeItem(CONVERSATIONS_KEY);
      console.log('[ChatService] All chat data cleared');
    } catch (error) {
      console.error('[ChatService] Failed to clear data', error);
    }
  }
}

// Create singleton instance
export const chatService = new ChatService();
export default chatService; 
