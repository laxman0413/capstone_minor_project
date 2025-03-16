import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

interface Message {
  sender: 'user' | 'admin';
  message: string;
  timestamp: Date;
  ticketId?: string;
}

interface SendMessageData {
  recipient: string;
  message: string;
  ticketId?: string;
}

interface EncryptedMessageNotification {
  messageId: string;
  senderName: string;
  senderEmail: string;
  timestamp: Date;
}

interface MessageNotification {
  ticketId: string;
  message: string;
  userId?: string;
  sender?: 'user' | 'admin';
}

interface StatusNotification {
  ticketId: string;
  status: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  // Default socket URL with fallback port support
  private readonly DEFAULT_PORT = 5000;
  private readonly SOCKET_URL: string;
  private activeTicketRooms: Set<string> = new Set();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private manuallyDisconnected = false;
  private socketInitialized = false;
  
  // Queue for pending subscriptions
  private pendingSubscriptions: Array<() => void> = [];
  
  // Public observable for connection status
  public connectionStatus$ = this.connectionStatus.asObservable();
  
  // Subject for error notifications
  private errorSubject = new Subject<string>();
  public errors$ = this.errorSubject.asObservable();

  constructor(private toastr?: ToastrService) {
    // Get server URL from environment, local storage, or default
    this.SOCKET_URL = `http://localhost:5000`;
    
    console.log(`Initializing socket service with URL: ${this.SOCKET_URL}`);
    
    // Initialize the socket connection
    this.initializeSocket();
  }
  
  private initializeSocket(websocketOnly = false, forcedTransports?: string[]) {
    try {
      // Get the current port from localStorage or use default
      const socketUrl = `http://localhost:5000`;
      
      console.log(`Initializing socket connection to: ${socketUrl}`);
      
      if (this.socket) {
        console.log('Cleaning up existing socket before reinitializing');
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }
      
      console.log('Creating new socket connection');
      
      // Configure transports based on parameters
      let transports: string[];
      if (forcedTransports) {
        transports = forcedTransports;
      } else {
        // Default to both polling and websocket, with polling first for better reliability
        transports = ['polling', 'websocket'];
      }
      console.log(`Using transports: ${transports.join(', ')}`);
      
      // Get the auth token
      const authToken = localStorage.getItem('authToken');
      console.log(`Auth token present: ${!!authToken}`);
      if (authToken) {
        console.log(`Auth token length: ${authToken.length}`);
      } else {
        console.warn('No auth token found in localStorage');
      }
      
      this.socket = io(socketUrl, {
        auth: {
          token: authToken
        },
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 20000, // Increased timeout
        transports: transports,
        withCredentials: true,
        forceNew: true,
        reconnection: true,
        // Add explicit CORS settings
        extraHeaders: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        // Add additional options to help with connection issues
        upgrade: true, // Allow transport upgrade
        rememberUpgrade: true,
        secure: false, // Set to true if using HTTPS
        rejectUnauthorized: false // Helps with self-signed certificates
      });
      
      this.socketInitialized = true;
      this.setupConnectionHandlers();
      
    } catch (error) {
      console.error('Error initializing socket:', error);
      this.errorSubject.next('Failed to initialize socket connection');
    }
  }
  
  private setupConnectionHandlers() {
    if (!this.socket) {
      console.error('Cannot setup connection handlers: Socket is not initialized');
      return;
    }
    
    // Handle connection
    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      this.connectionStatus.next(true);
      this.reconnectAttempts = 0;
      this.manuallyDisconnected = false;
      
      // Log connection details for debugging
      console.log(`Socket ID: ${this.socket?.id}`);
      console.log(`Connected using transport: ${this.socket?.io?.engine?.transport?.name}`);
      
      if (this.toastr) {
        this.toastr.success('Real-time connection established', 'Connected');
      }
      
      // Process any pending subscriptions
      if (this.pendingSubscriptions.length > 0) {
        console.log(`Processing ${this.pendingSubscriptions.length} pending subscriptions after connect`);
        this.processPendingSubscriptions();
      }
      
      // Start ping interval to keep connection alive
      this.startPingInterval();
    });
    
    // Handle connection acknowledgment
    this.socket.on('connectionAcknowledged', (data) => {
      console.log('Connection acknowledged by server:', data);
    });
    
    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      this.connectionStatus.next(false);
      
      // Clear active rooms on disconnect
      this.activeTicketRooms.clear();
      
      // Stop ping interval
      this.stopPingInterval();
      
      if (!this.manuallyDisconnected && reason !== 'io client disconnect') {
        console.log('Disconnection was not manual, attempting to reconnect');
        this.attemptReconnect();
      }
    });
    
    // Handle connection error
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionStatus.next(false);
      this.errorSubject.next(`Connection error: ${error.message}`);
      
      // Handle transport errors specifically
      if (error.message) {
        // Check for specific XHR poll errors
        if (error.message.includes('xhr poll error')) {
          console.log('XHR Poll Error detected - attempting to recover with alternative transport');
          
          // Try a different approach - use a different port and transport
          const currentPort = localStorage.getItem('serverPort') || this.DEFAULT_PORT;
          
          // Try the same port first but with websocket-only transport
          console.log('Attempting to switch to websocket-only transport');
          
          if (this.socket) {
            this.socket.disconnect();
          }
          
          setTimeout(() => {
            // First try with websocket only
            this.initializeSocket(true, ['websocket']);
            
            // If that fails, we'll fall back to polling only in the connect_error handler
          }, 1000);
          
          return;
        }
        
        // Check for websocket errors
        if (error.message.includes('websocket error')) {
          console.log('WebSocket Error detected - falling back to polling transport');
          
          if (this.socket) {
            this.socket.disconnect();
          }
          
          setTimeout(() => {
            // Reinitialize with polling-only transport
            this.initializeSocket(false, ['polling']);
          }, 1000);
          
          return;
        }
        
        // Check for authentication errors
        if (error.message.includes('Authentication error') || error.message.includes('Unauthorized')) {
          console.error('Authentication error detected:', error.message);
          
          if (this.toastr) {
            this.toastr.error('Authentication failed. Please log in again.', 'Auth Error');
          }
          
          // Don't attempt to reconnect for auth errors
          this.manuallyDisconnected = true;
          return;
        }
        
        this.attemptReconnect();
      } else {
        this.attemptReconnect();
      }
    });
    
    // Handle server errors
    this.socket.on('error', (error) => {
      console.error('Socket error from server:', error);
      this.errorSubject.next(`Socket error: ${error.message || 'Unknown error'}`);
      
      // Handle specific error types
      if (error.message && error.message.includes('Authentication')) {
        console.log('Authentication error detected. Token may be invalid.');
        if (this.toastr) {
          this.toastr.error('Authentication failed. Please log in again.', 'Auth Error');
        }
      }
    });
    
    // Handle pong responses
    this.socket.on('pong', (data) => {
      console.log('Received pong from server:', data);
      // Update connection status based on successful pong
      this.connectionStatus.next(true);
    });
    
    // Handle transport changes
    if (this.socket.io && this.socket.io.engine) {
      this.socket.io.engine.on('upgrade', (transport) => {
        console.log(`Transport upgraded to: ${transport}`);
      });
      
      this.socket.io.engine.on('upgradeError', (err) => {
        console.error('Transport upgrade error:', err);
      });
    }
  }
  
  private attemptReconnect() {
    if (this.manuallyDisconnected) {
      console.log('Not attempting to reconnect because socket was manually disconnected');
      return;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      this.reconnectTimer = setTimeout(() => {
        console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
        this.reconnect();
      }, delay);
    } else {
      console.log('Maximum reconnection attempts reached');
      this.errorSubject.next('Failed to connect after multiple attempts. Please refresh the page.');
      
      if (this.toastr) {
        this.toastr.error('Connection lost. Please refresh the page.', 'Connection Error');
      }
    }
  }

  /**
   * Safe method to listen to any socket event, with queue support for when socket isn't ready
   * @param eventName The name of the event to listen for
   * @param callback The callback function to execute when the event is received
   * @returns A function to unsubscribe
   */
  on(eventName: string, callback: (data: any) => void): () => void {
    // If socket is not initialized, queue this subscription for later
    if (!this.socket || !this.socket.connected) {
      console.log(`Socket not ready, queueing subscription to ${eventName}`);
      
      // Add to pending subscriptions
      const subscriptionFn = () => {
        console.log(`Processing queued subscription to ${eventName}`);
        if (this.socket) {
          this.socket.on(eventName, callback);
        }
      };
      
      this.pendingSubscriptions.push(subscriptionFn);
      
      // Return an unsubscribe function
      return () => {
        // Remove from pending queue if not processed yet
        const index = this.pendingSubscriptions.indexOf(subscriptionFn);
        if (index !== -1) {
          this.pendingSubscriptions.splice(index, 1);
        }
        
        // Also remove the actual listener if socket exists
        if (this.socket) {
          this.socket.off(eventName, callback);
        }
      };
    }
    
    // If socket is ready, subscribe immediately
    this.socket.on(eventName, callback);
    
    // Return an unsubscribe function
    return () => {
      if (this.socket) {
        this.socket.off(eventName, callback);
      }
    };
  }

  /**
   * Join a specific ticket room to receive messages for that ticket
   * @param ticketId The ID of the ticket to join
   * @returns Promise that resolves when joined or rejects on error
   */
  joinTicketRoom(ticketId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!ticketId) {
        console.error('Cannot join ticket room: Ticket ID is required');
        reject(new Error('Ticket ID is required'));
        return;
      }

      // If already in this room, resolve immediately
      if (this.activeTicketRooms.has(ticketId)) {
        console.log(`Already in ticket room: ${ticketId}`);
        resolve();
        return;
      }
      
      // Check if socket is connected
      if (!this.socket || !this.socket.connected) {
        console.error('Socket is not connected. Cannot join ticket room.');
        
        // Try to reconnect
        this.reconnect();
        
        reject(new Error('Socket is not connected. Please try again after reconnecting.'));
        return;
      }

      console.log(`Attempting to join ticket room: ${ticketId}`);
      console.log(`Auth token: ${localStorage.getItem('authToken') ? 'Present (length: ' + localStorage.getItem('authToken')?.length + ')' : 'Missing'}`);
      
      // Set up one-time listener for join confirmation before emitting the event
      this.socket.once('joinedTicketRoom', (data) => {
        if (data.ticketId === ticketId) {
          this.activeTicketRooms.add(ticketId);
          console.log(`Successfully joined ticket room: ${ticketId}`);
          resolve();
        } else {
          console.warn(`Received joinedTicketRoom event with mismatched ticketId: expected ${ticketId}, got ${data.ticketId}`);
          reject(new Error('Received confirmation for wrong ticket room'));
        }
      });

      // Set up one-time listener for error
      this.socket.once('error', (error) => {
        console.error('Error joining ticket room:', error);
        
        // Check if the error is related to authentication
        if (error.message && (
            error.message.includes('Unauthorized') || 
            error.message.includes('authentication') ||
            error.message.includes('auth')
          )) {
          console.log('Authentication issue detected. Current auth token may be invalid.');
          reject(new Error(`Authentication error: ${error.message}`));
        } else {
          reject(new Error(error.message || 'Failed to join ticket room'));
        }
      });

      // Set timeout for join operation
      const timeoutId = setTimeout(() => {
        // Remove the listeners to prevent memory leaks
        if (this.socket) {
          this.socket.off('joinedTicketRoom');
          this.socket.off('error');
        }
        console.error('Timeout joining ticket room:', ticketId);
        reject(new Error('Timeout joining ticket room'));
      }, 10000); // 10 seconds timeout

      // Now emit the event to join the room
      this.socket.emit('joinTicketRoom', { ticketId }, (response: any) => {
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        if (response && response.error) {
          console.error('Error response from server when joining room:', response.error);
          reject(new Error(response.error));
        } else if (response && response.success) {
          console.log('Server acknowledged join room request with success');
          this.activeTicketRooms.add(ticketId);
          resolve();
        }
      });

      // Add a listener to clear the timeout when either event occurs
      const clearTimeoutFn = () => {
        clearTimeout(timeoutId);
      };
      
      this.socket.once('joinedTicketRoom', clearTimeoutFn);
      this.socket.once('error', clearTimeoutFn);
    });
  }

  /**
   * Leave a specific ticket room
   * @param ticketId The ID of the ticket room to leave
   * @returns Promise that resolves when left or rejects on error
   */
  leaveTicketRoom(ticketId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!ticketId) {
        console.log('Cannot leave ticket room: No ticket ID provided');
        resolve(); // Not an error, just nothing to do
        return;
      }
      
      // If not in this room, resolve immediately
      if (!this.activeTicketRooms.has(ticketId)) {
        console.log(`Not in ticket room ${ticketId}, nothing to leave`);
        resolve();
        return;
      }
      
      // Check if socket is connected
      if (!this.socket || !this.socket.connected) {
        console.log('Socket is not connected. Cannot leave ticket room, but removing from active rooms.');
        this.activeTicketRooms.delete(ticketId);
        resolve(); // Resolve anyway since we've removed it from our tracking
        return;
      }
      
      console.log(`Leaving ticket room: ${ticketId}`);
      
      // Set a timeout for the operation
      const timeoutId = setTimeout(() => {
        console.log(`Timeout leaving ticket room ${ticketId}, but removing from active rooms anyway`);
        this.activeTicketRooms.delete(ticketId);
        resolve(); // Resolve anyway to prevent blocking
      }, 5000);
      
      // Emit the leave event with acknowledgment
      this.socket.emit('leaveTicketRoom', { ticketId }, (response: any) => {
        clearTimeout(timeoutId);
        
        if (response && response.error) {
          console.warn(`Error leaving ticket room ${ticketId}:`, response.error);
          // Still remove from our tracking even if server had an error
          this.activeTicketRooms.delete(ticketId);
          resolve(); // Resolve anyway to prevent blocking
        } else {
          console.log(`Successfully left ticket room: ${ticketId}`);
          this.activeTicketRooms.delete(ticketId);
          resolve();
        }
      });
      
      // If no acknowledgment callback is supported by the server, still remove from tracking
      setTimeout(() => {
        this.activeTicketRooms.delete(ticketId);
      }, 500);
    });
  }

  /**
   * Creates an observable for a socket event with queue support
   * @param eventName The socket event to listen for
   * @returns An observable that emits when the event occurs
   */
  createEventObservable<T>(eventName: string): Observable<T> {
    return new Observable<T>(observer => {
      // If socket is not initialized, we'll handle it with the queue
      if (!this.socketInitialized) {
        console.log(`Socket not initialized, queueing observable for ${eventName}`);
        
        // Add to pending subscriptions
        const subscriptionFn = () => {
          if (this.socket) {
            console.log(`Processing queued observable for ${eventName}`);
            this.socket.on(eventName, (data: any) => observer.next(data as T));
          }
        };
        
        this.pendingSubscriptions.push(subscriptionFn);
        
        // Return cleanup function
        return () => {
          // Remove from pending queue if not processed yet
          const index = this.pendingSubscriptions.indexOf(subscriptionFn);
          if (index !== -1) {
            this.pendingSubscriptions.splice(index, 1);
          }
          
          // Also remove the actual listener if socket exists
          if (this.socket) {
            this.socket.off(eventName);
          }
        };
      }
      
      // Socket is initialized but might not be connected
      if (!this.socket) {
        observer.error(new Error('Socket is not initialized'));
        return;
      }
      
      // Set up the event listener
      this.socket.on(eventName, (data: any) => {
        observer.next(data as T);
      });
      
      // Return cleanup function
      return () => {
        if (this.socket) {
          this.socket.off(eventName);
        }
      };
    });
  }

  /**
   * Listen for ticket updates
   */
  listenToTicketUpdates(): Observable<any> {
    return this.createEventObservable<any>('ticketUpdate');
  }

  /**
   * Listen for chat messages
   */
  listenToMessages(): Observable<Message> {
    return this.createEventObservable<Message>('chatMessage');
  }

  /**
   * Listen for message notifications
   */
  listenToMessageNotifications(): Observable<MessageNotification> {
    return this.createEventObservable<MessageNotification>('messageNotification');
  }

  /**
   * Listen for status notifications
   */
  listenToStatusNotifications(): Observable<StatusNotification> {
    return this.createEventObservable<StatusNotification>('statusNotification');
  }

  /**
   * Listen for encrypted message notifications
   */
  listenToEncryptedMessages(): Observable<EncryptedMessageNotification> {
    return this.createEventObservable<EncryptedMessageNotification>('newEncryptedMessage');
  }

  sendMessage(data: SendMessageData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if the socket is connected
      if (!this.socket || !this.socket.connected) {
        console.error('Cannot send message: Socket is not connected', {
          socketExists: !!this.socket,
          connected: this.socket?.connected
        });
        reject(new Error('Socket is not connected'));
        return;
      }
      
      // Log message details for debugging
      console.log('Sending message:', {
        recipient: data.recipient,
        ticketId: data.ticketId,
        messagePreview: data.message.substring(0, 30) + (data.message.length > 30 ? '...' : ''),
        socketId: this.socket.id,
        transport: this.socket.io?.engine?.transport?.name
      });
      
      // Set up a timeout in case the server doesn't respond
      const timeoutId = setTimeout(() => {
        console.warn('No response from server after sending message (timeout)');
        resolve(); // Resolve anyway to prevent blocking UI
      }, 8000);
      
      // Send the message to the server
      this.socket.emit('sendMessage', data, (response: any) => {
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        // Log the response for debugging
        console.log('Response from server for message:', response);
        
        if (response && response.error) {
          console.error('Error response from server:', response.error);
          reject(new Error(response.error));
        } else if (response && response.success) {
          console.log('Message sent successfully, server acknowledged', {
            messageId: response.messageId
          });
          resolve();
        } else {
          console.warn('Received unexpected response format from server:', response);
          resolve(); // Resolve anyway to avoid blocking UI
        }
      });
    });
  }

  async getChatHistory(ticketId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket is not connected'));
        return;
      }
      
      this.socket.emit('getChatHistory', { ticketId }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.history);
        }
      });
    });
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    
    // Stop ping interval
    this.stopPingInterval();
    
    // Leave all active ticket rooms
    this.activeTicketRooms.forEach(ticketId => {
      this.leaveTicketRoom(ticketId);
    });
    
    if (this.socket) {
      console.log('Manually disconnecting socket');
      this.socket.disconnect();
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  reconnect(): void {
    // Reset manual disconnect flag
    this.manuallyDisconnected = false;
    
    if (this.socket) {
      console.log('Attempting to reconnect socket...');
      
      // If the socket is already connected, don't try to reconnect
      if (this.socket.connected) {
        console.log('Socket is already connected, no need to reconnect');
        this.connectionStatus.next(true);
        return;
      }
      
      // If we're already trying to reconnect, don't start another attempt
      if (this.reconnectTimer) {
        console.log('Socket is already trying to reconnect');
        return;
      }
      
      // Disconnect the existing socket first
      try {
        this.socket.disconnect();
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
      
      // Try a different approach - alternate between ports
      const currentPort = localStorage.getItem('serverPort') || this.DEFAULT_PORT;
      const alternatePort = '5000';
      localStorage.setItem('serverPort', alternatePort.toString());
      
      console.log(`Switching to alternate port: ${alternatePort}`);
      
      // Reinitialize with polling transport
      setTimeout(() => {
        this.initializeSocket(false, ['polling']);
      }, 1000);
    } else {
      console.log('Socket not initialized, creating new connection');
      this.initializeSocket(false, ['polling']);
    }
  }
  
  // Utility to reset port to default
  resetPort(): void {
    localStorage.removeItem('serverPort');
    console.log('Server port reset to default');
    
    // Reinitialize with default port
    this.initializeSocket();
  }
  
  // Check if socket is currently connected
  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  // Ping interval to detect zombie connections
  private pingInterval: any = null;
  private pingTimeout = 3000; // 30 seconds
  
  private startPingInterval() {
    // Clear any existing interval
    this.stopPingInterval();
    
    // Start a new ping interval
    this.pingInterval = setInterval(() => {
      this.pingServer().catch(error => {
        console.error('Ping error:', error);
      });
    }, this.pingTimeout);
    
    console.log(`Started ping interval (${this.pingTimeout}ms)`);
  }
  
  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      console.log('Stopped ping interval');
    }
  }
  
  /**
   * Ping the server to check connection health
   * @returns Promise that resolves with the ping result or rejects on timeout/error
   */
  public pingServer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Early return if socket is not available or connected
      if (!this.socket || !this.socket.connected) {
        console.log('Cannot ping: Socket is not connected');
        this.connectionStatus.next(false);
        this.attemptReconnect();
        reject(new Error('Socket is not connected'));
        return;
      }
      
      console.log('Pinging server...');
      
      // Create a local reference to the socket to avoid null issues
      const socket = this.socket;
      
      // Set a timeout for the ping response
      const pingTimeout = setTimeout(() => {
        console.error('Ping timeout - no response from server');
        this.connectionStatus.next(false);
        
        // Force reconnection
        if (this.socket) {
          this.socket.disconnect();
        }
        this.attemptReconnect();
        reject(new Error('Ping timeout'));
      }, 5000); // 5 second timeout for ping response
      
      // Send ping to server using the local reference
      socket.emit('ping', { timestamp: new Date() }, (response: any) => {
        clearTimeout(pingTimeout);
        
        if (response && response.pong) {
          console.log('Received pong from server');
          this.connectionStatus.next(true);
          resolve(true);
        } else {
          console.error('Invalid ping response:', response);
          this.connectionStatus.next(false);
          this.attemptReconnect();
          reject(new Error('Invalid ping response'));
        }
      });
    });
  }

  /**
   * Process any pending subscriptions that were requested before the socket was ready
   */
  private processPendingSubscriptions() {
    console.log(`Processing ${this.pendingSubscriptions.length} pending subscriptions`);
    
    // Execute all pending subscription functions
    while (this.pendingSubscriptions.length > 0) {
      const subscription = this.pendingSubscriptions.shift();
      if (subscription) {
        try {
          subscription();
        } catch (error) {
          console.error('Error processing pending subscription:', error);
        }
      }
    }
  }

  /**
   * Check if we're already in a specific ticket room
   * @param ticketId The ID of the ticket room to check
   * @returns True if already in the room, false otherwise
   */
  isInTicketRoom(ticketId: string): boolean {
    if (!ticketId) return false;
    return this.activeTicketRooms.has(ticketId);
  }
}