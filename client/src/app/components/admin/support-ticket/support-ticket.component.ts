import { Component, OnInit, ChangeDetectorRef, NgZone, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../services/socket.service';
import { ToastrService } from 'ngx-toastr';
import { AdminService } from '../../../services/admin.service';
import { Subscription } from 'rxjs';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Message {
  sender: 'user' | 'admin';
  message: string;
  timestamp: Date;
  ticketId?: string;
}

interface UserTicket {
  _id: string;
  user: string | User;
  issue: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  messages: Message[];
  // Keep userId for backward compatibility
  userId?: User | string;
}

@Component({
  selector: 'app-admin-support-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './support-ticket.component.html',
  styleUrls: ['./support-ticket.component.css']
})
export class SupportTicketComponent implements OnInit, OnDestroy {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  
  tickets: UserTicket[] = [];
  loading = false;
  selectedTicket: UserTicket | null = null;
  newMessage = '';
  error = '';
  private subscriptions: Subscription[] = [];
  private currentTicketId: string | null = null;
  private isSocketConnected = false;
  constructor(
    private adminService: AdminService,
    private socketService: SocketService,
    private toastr: ToastrService,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    console.log('Support ticket component initializing...');
    
    // Subscribe to socket errors
    this.subscriptions.push(
      this.socketService.errors$.subscribe(error => {
        console.error('Socket error received in component:', error);
        this.error = `Connection issue: ${error}`;
        this.isSocketConnected = false;
  
      })
    );
    
    // First load tickets to show something to the user quickly
    this.loadTickets().then(() => {
      console.log('Tickets loaded, now connecting socket...');
      // Then connect socket for real-time updates
      this.connectSocket();
    }).catch(error => {
      console.error('Error loading tickets:', error);
      // Still try to connect socket even if ticket loading fails
      this.connectSocket();
    });
    
    // Set up periodic reconnection check
    const reconnectInterval = setInterval(() => {
      if (!this.isSocketConnected) {
        console.log('Periodic reconnection check - attempting to reconnect');
        this.connectSocket();
      } else {
        // If connected, ping the server to ensure connection is still alive
        this.socketService.pingServer()
          .then(() => {
            // Connection is good, no action needed
            this.isSocketConnected = true;
          })
          .catch(error => {
            console.error('Ping failed:', error);
            this.isSocketConnected = false;
            // Don't try to reconnect here, the pingServer method already does that
          });
      }
    }, 30000); // Check every 30 seconds
    
    // Store the interval for cleanup
    this.subscriptions.push({
      unsubscribe: () => clearInterval(reconnectInterval)
    } as Subscription);
  }

  ngOnDestroy() {
    // Leave the current ticket room if any
    if (this.currentTicketId) {
      this.socketService.leaveTicketRoom(this.currentTicketId);
    }
    
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.socketService.disconnect();
  }

  private connectSocket() {
    if (!this.isSocketConnected) {
      try {
        console.log('Attempting to connect socket...');
        
        // Reset any error state
        this.error = '';
        
        // Try to reconnect the socket
        this.socketService.reconnect();
        
        // Wait for connection status update with a timeout
        let connectionTimeout: any = null;
        
        const subscription = this.socketService.connectionStatus$.subscribe(
          isConnected => {
            if (isConnected) {
              console.log('Socket connected successfully');
              this.isSocketConnected = true;
              
              // Clear timeout if it exists
              if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
              }
              
              // Setup listeners only after successful connection
              this.setupSocketListeners();
              
              // If we have a selected ticket, make sure we're in the right room
              if (this.selectedTicket && this.currentTicketId) {
                console.log(`Ensuring we're in the correct ticket room: ${this.currentTicketId}`);
                this.socketService.joinTicketRoom(this.currentTicketId)
                  .then(() => {
                    console.log(`Successfully joined ticket room ${this.currentTicketId} after connection`);
                    // Reload messages to ensure we have the latest
                    if (this.currentTicketId) {
                      return this.socketService.getChatHistory(this.currentTicketId);
                    }
                    return Promise.resolve(null);
                  })
                  .then(history => {
                    if (history && history.length > 0 && this.selectedTicket) {
                      console.log(`Received ${history.length} messages after connection`);
                      this.selectedTicket.messages = history;
                      this.cdRef.detectChanges();
                      setTimeout(() => this.scrollToBottom(), 200);
                    }
                  })
                  .catch(err => console.error('Error joining room after connection:', err));
              }
              
              // Try to send any pending messages
              this.sendPendingMessages();
              
              // Unsubscribe after successful connection
              subscription.unsubscribe();
            }
          },
          error => {
            console.error('Error in connection status subscription:', error);
            this.isSocketConnected = false;
            
            // Clear timeout if it exists
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              connectionTimeout = null;
            }
            
            subscription.unsubscribe();
          }
        );
        
        // Add subscription to cleanup list
        this.subscriptions.push(subscription);
        
        // Set a timeout to prevent waiting indefinitely
        connectionTimeout = setTimeout(() => {
          console.log('Socket connection timeout - proceeding without real-time updates');
          this.isSocketConnected = false;
          subscription.unsubscribe();
          
          // Still try to load tickets even without socket connection
          this.loadTickets();
          
          // Show a warning to the user
          this.toastr.warning('Unable to establish real-time connection. Messages may not update automatically.', 'Connection Issue');
        }, 8000); // Increased timeout for better chance of connection
      } catch (error) {
        console.error('Failed to connect socket:', error);
        this.toastr.error('Failed to connect to real-time updates');
        this.isSocketConnected = false;
      }
    }
  }

  private setupSocketListeners() {
    // Message subscription
    this.subscriptions.push(
      this.socketService.listenToMessages().subscribe(message => {
        this.ngZone.run(() => {
          console.log('Admin received message:', message);
          
          // Only process messages for the currently selected ticket
          if (this.selectedTicket && message.ticketId === this.selectedTicket._id) {
            console.log('Admin adding message to current ticket');
            
            // Ensure messages array exists
            if (!this.selectedTicket.messages) {
              this.selectedTicket.messages = [];
            }
            
            // Check if this message is already in the array (prevent duplicates)
            const isDuplicate = this.selectedTicket.messages.some(m => 
              m.sender === message.sender && 
              m.message === message.message && 
              Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000
            );
            
            if (!isDuplicate) {
              // Add the message to the array
              this.selectedTicket.messages.push(message);
              this.cdRef.detectChanges();
              
              // Set flag to scroll to bottom
              this.scrollToBottom();
              
              // Play notification sound for user messages that admin is viewing
              if (message.sender === 'user') {
                this.toastr.info('New message from user');
              }
            } else {
              console.log('Duplicate message detected, not adding to UI');
            }
          } else {
            console.log('Message is for a different ticket or no ticket selected');
            // Refresh tickets to show updated message count
            this.loadTickets();
          }
        });
      })
    );

    // Ticket update subscription
    this.subscriptions.push(
      this.socketService.listenToTicketUpdates().subscribe(update => {
        this.ngZone.run(() => {
          this.tickets = this.tickets.map(ticket =>
            ticket._id === update.ticketId ? { ...ticket, status: update.status } : ticket
          );
          if (this.selectedTicket?._id === update.ticketId) {
            this.selectedTicket!.status = update.status;
          }
          this.toastr.info(`Ticket status updated to ${update.status}`);
          this.cdRef.detectChanges();
        });
      })
    );

    // Message notification subscription
    this.subscriptions.push(
      this.socketService.listenToMessageNotifications().subscribe(notification => {
        this.ngZone.run(() => {
          console.log('Admin received message notification:', notification);
          
          // Only show notification if it's not for the currently selected ticket
          if (!this.selectedTicket || notification.ticketId !== this.selectedTicket._id) {
            // Add specific notification for user messages
            if (notification.sender === 'user') {
              this.toastr.info('New message from user', `Ticket ${notification.ticketId}`);
            } else {
              this.toastr.info(notification.message);
            }
            
            // Refresh tickets to show updated message count
            this.loadTickets();
          }
        });
      })
    );
  }

  private async sendPendingMessages() {
    const pendingMessagesStr = localStorage.getItem('pendingMessages');
    if (!pendingMessagesStr) return;
    
    try {
      const pendingMessages = JSON.parse(pendingMessagesStr);
      if (!Array.isArray(pendingMessages) || pendingMessages.length === 0) return;
      
      console.log(`Found ${pendingMessages.length} pending messages to send`);
      
      // Create a copy of the array to avoid modification during iteration
      const messagesToSend = [...pendingMessages];
      
      // Clear the pending messages
      localStorage.setItem('pendingMessages', '[]');
      
      // Try to send each message
      for (const pendingMessage of messagesToSend) {
        try {
          await this.socketService.sendMessage({
            recipient: 'admin',
            message: pendingMessage.message,
            ticketId: pendingMessage.ticketId
          });
          
          console.log(`Successfully sent pending message: ${pendingMessage.message.substring(0, 20)}...`);
          
          // If this is for the currently selected ticket, update the UI
          if (this.selectedTicket && this.selectedTicket._id === pendingMessage.ticketId) {
            // Find any pending messages in the UI and remove the (pending) indicator
            const index = this.selectedTicket.messages.findIndex(m => 
              m.message.includes(pendingMessage.message) && m.message.includes('(pending)')
            );
            
            if (index !== -1) {
              this.selectedTicket.messages[index].message = 
                this.selectedTicket.messages[index].message.replace(' (pending)', '');
              this.cdRef.detectChanges();
            }
          }
        } catch (error) {
          console.error(`Failed to send pending message: ${pendingMessage.message.substring(0, 20)}...`, error);
          
          // Add back to pending messages
          const currentPendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
          currentPendingMessages.push(pendingMessage);
          localStorage.setItem('pendingMessages', JSON.stringify(currentPendingMessages));
        }
      }
      
      if (messagesToSend.length > 0) {
        this.toastr.success(`Sent ${messagesToSend.length} pending messages`, 'Sync Complete');
      }
    } catch (error) {
      console.error('Error processing pending messages:', error);
    }
  }
  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        const element = this.messageContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }, 100);
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  async loadTickets() {
    try {
      this.loading = true;
      console.log('Admin component: Loading tickets');
      
      const response = await this.adminService.getTickets();
      console.log('Admin component: Received response from server');
      
      if (Array.isArray(response)) {
        this.tickets = response as UserTicket[];
        console.log(`Admin component: Loaded ${this.tickets.length} tickets`);
        
        // Log the first few tickets for debugging
        if (this.tickets.length > 0) {
          console.log('Sample tickets:');
          this.tickets.slice(0, 3).forEach((ticket, index) => {
            console.log(`Ticket ${index + 1}:`, {
              id: ticket._id,
              user: ticket.user ? (typeof ticket.user === 'object' ? 
                { id: ticket.user._id, name: ticket.user.name } : 
                'ID: ' + ticket.user) : 'No user',
              userId: ticket.userId ? (typeof ticket.userId === 'object' ? 
                { id: ticket.userId._id, name: ticket.userId.name } : 
                'ID: ' + ticket.userId) : 'No userId',
              issue: ticket.issue.substring(0, 30) + (ticket.issue.length > 30 ? '...' : ''),
              status: ticket.status
            });
          });
        } else {
          console.log('No tickets found');
        }
        
        this.tickets.sort((a, b) => {
          const statusPriority = { open: 0, 'in-progress': 1, resolved: 2 };
          if (statusPriority[a.status] !== statusPriority[b.status]) {
            return statusPriority[a.status] - statusPriority[b.status];
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else {
        console.error('Admin component: Response is not an array', response);
        this.error = 'Invalid response format from server';
        this.toastr.error('Failed to load tickets: Invalid response format');
      }
    } catch (error) {
      console.error('Admin component: Error loading tickets', error);
      this.toastr.error('Failed to load tickets');
      this.error = 'Failed to load tickets';
    } finally {
      this.loading = false;
      this.cdRef.detectChanges();
    }
  }

  async selectTicket(ticket: UserTicket) {
    try {
      console.log('Admin selecting ticket:', ticket._id);
      
      // Leave the current ticket room if any
      if (this.currentTicketId) {
        console.log('Admin leaving current ticket room:', this.currentTicketId);
        try {
          await this.socketService.leaveTicketRoom(this.currentTicketId);
          console.log('Admin successfully left previous ticket room');
        } catch (leaveError) {
          console.warn('Error leaving previous ticket room:', leaveError);
          // Continue anyway, as we'll join a new room
        }
      }
      
      this.selectedTicket = ticket;
      this.currentTicketId = ticket._id;
      
      // Join the new ticket room
      try {
        console.log('Admin attempting to join ticket room:', ticket._id);
        await this.socketService.joinTicketRoom(ticket._id);
        console.log('Admin successfully joined ticket room:', ticket._id);
      } catch (joinError: any) {
        console.error('Admin error joining ticket room:', joinError);
        
        // Check if it's an authorization error
        if (joinError.message && joinError.message.includes('Unauthorized')) {
          this.toastr.error('You do not have permission to access this ticket', 'Access Denied');
          this.error = 'Access denied: You do not have permission to view this ticket';
          
          // Reset selection
          this.selectedTicket = null;
          this.currentTicketId = null;
          return;
        }
        
        // For other errors, continue with local data but show a warning
        this.toastr.warning('Unable to connect to real-time updates for this ticket', 'Connection Issue');
      }
      
      // Load chat history
      try {
        console.log('Admin fetching chat history for ticket:', ticket._id);
        const history = await this.socketService.getChatHistory(ticket._id);
        console.log('Admin received chat history:', history?.length || 0, 'messages');
        
        if (history && history.length > 0) {
          this.selectedTicket.messages = history;
        } else if (!this.selectedTicket.messages) {
          // Ensure messages array exists even if empty
          this.selectedTicket.messages = [];
        }
      } catch (historyError: any) {
        console.error('Admin error loading chat history:', historyError);
        this.toastr.warning('Unable to load message history', 'Data Loading Issue');
        
        // Continue with empty or existing messages
        if (!this.selectedTicket.messages) {
          this.selectedTicket.messages = [];
        }
      }
      
      this.cdRef.detectChanges();
      this.scrollToBottom();
    } catch (error) {
      console.error('Admin critical error selecting ticket:', error);
      this.toastr.error('Failed to load ticket data');
      this.error = 'Failed to load ticket data';
      
      // Reset selection on critical errors
      this.selectedTicket = null;
      this.currentTicketId = null;
    }
  }

  async sendMessage() {
    if (!this.selectedTicket) {
      console.error('Cannot send message: No ticket selected');
      this.toastr.error('Please select a ticket first');
      return;
    }
    
    if (!this.newMessage.trim()) {
      console.error('Cannot send message: Message is empty');
      return;
    }
    
    if (this.selectedTicket.status === 'resolved') {
      console.error('Cannot send message: Ticket is resolved');
      this.toastr.warning('Cannot send messages to resolved tickets');
      return;
    }

    const messageText = this.newMessage.trim();
    const ticketId = this.selectedTicket._id;
    
    // Store the message text in case we need to restore it
    const originalMessage = messageText;
    
    try {
      // Clear input immediately for better UX
      this.newMessage = '';
      
      // Validate ticketId
      if (!ticketId) {
        throw new Error('Invalid ticket ID');
      }
      
      console.log(`Admin preparing to send message for ticket: ${ticketId}`);
      
      // Create optimistic message for immediate UI feedback
      const optimisticMessage: Message = {
        sender: 'admin',
        message: messageText,
        timestamp: new Date(),
        ticketId: ticketId
      };
      
      // Add message to UI immediately
      if (!this.selectedTicket.messages) {
        this.selectedTicket.messages = [];
      }
      
      this.selectedTicket.messages.push(optimisticMessage);
      this.cdRef.detectChanges();
      this.scrollToBottom();

      // Ensure socket is connected
      if (!this.socketService.isConnected()) {
        console.log('Socket not connected, attempting to reconnect before sending message');
        this.socketService.reconnect();
        
        // Wait for connection with a timeout
        let connectionTimeout: any;
        const isConnected = await Promise.race([
          new Promise<boolean>(resolve => {
            const subscription = this.socketService.connectionStatus$.subscribe(connected => {
              if (connected) {
                clearTimeout(connectionTimeout);
                subscription.unsubscribe();
                resolve(true);
              }
            });
            
            // Add to cleanup list
            this.subscriptions.push(subscription);
          }),
          new Promise<boolean>(resolve => {
            connectionTimeout = setTimeout(() => {
              resolve(false);
            }, 5000);
          })
        ]);
        
        if (!isConnected) {
          console.warn('Failed to reconnect socket, message may not be delivered');
          this.toastr.warning('Connection issue detected, message may not be delivered', 'Connection Warning');
        }
      }

      // Double-check that we're in the correct ticket room
      if (!this.socketService.isInTicketRoom(ticketId)) {
        console.log(`Admin not in ticket room ${ticketId}, attempting to join before sending message`);
        try {
          await this.socketService.joinTicketRoom(ticketId);
          console.log(`Admin successfully joined ticket room ${ticketId} before sending message`);
        } catch (joinError) {
          console.error(`Admin failed to join ticket room ${ticketId} before sending message:`, joinError);
          // Continue anyway and try to send the message
        }
      }

      // Send message to server with correct recipient
      await this.socketService.sendMessage({
        recipient: 'user', // Explicitly set recipient to 'user' for admin messages
        message: messageText,
        ticketId: ticketId
      });

      console.log('Admin message sent successfully');
      this.toastr.success('Message sent', '', { timeOut: 1000 });
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      this.toastr.error('Failed to send message: ' + (error.message || 'Unknown error'));
      
      // Optional: Mark the optimistic message as failed
      if (this.selectedTicket?.messages) {
        const index = this.selectedTicket.messages.findIndex(m => 
          m.message === messageText && m.sender === 'admin' && 
          Math.abs(new Date().getTime() - new Date(m.timestamp).getTime()) < 5000
        );
        
        if (index !== -1) {
          // Add a visual indicator that the message failed
          this.selectedTicket.messages[index].message += ' (failed to send)';
          this.cdRef.detectChanges();
        }
      }
      
      // Restore message to input field
      this.newMessage = originalMessage;
    }
  }

  async updateTicketStatus(ticketId: string, status: 'open' | 'in-progress' | 'resolved') {
    try {
      await this.adminService.updateTicketStatus(ticketId, status);
      this.toastr.success(`Ticket status updated to ${status}`);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      this.toastr.error('Failed to update ticket status');
    }
  }

  /**
   * Get the user's name from the ticket
   * @param ticket The ticket to extract the user name from
   * @returns The user's name or 'User' if not available
   */
  getUserName(ticket: UserTicket): string {
    // Check if user is an object with name property
    if (ticket.user && typeof ticket.user === 'object' && ticket.user.name) {
      return ticket.user.name;
    }
    
    // Fallback to userId if it's an object with name
    if (ticket.userId && typeof ticket.userId === 'object' && ticket.userId.name) {
      return ticket.userId.name;
    }
    
    // Default fallback
    return 'User';
  }

  /**
   * Display user information in a formatted way
   * @param ticket The ticket containing user information
   * @returns Formatted user information string
   */
  displayUserInfo(ticket: UserTicket): string {
    // Check if user is an object with name and email
    if (ticket.user && typeof ticket.user === 'object') {
      return `${ticket.user.name} (${ticket.user.email})`;
    }
    
    // Fallback to userId if it's an object
    if (ticket.userId && typeof ticket.userId === 'object') {
      return `${ticket.userId.name} (${ticket.userId.email})`;
    }
    
    // If we only have IDs, return a simple string
    return `User ID: ${typeof ticket.user === 'string' ? ticket.user : 
           (typeof ticket.userId === 'string' ? ticket.userId : 'Unknown')}`;
  }

  /**
   * Get CSS class for priority badge
   * @param priority The ticket priority
   * @returns CSS class name
   */
  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  /**
   * Get CSS class for status badge
   * @param status The ticket status
   * @returns CSS class name
   */
  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  /**
   * Check if the selected ticket is resolved
   * @returns True if the ticket is resolved
   */
  isTicketResolved(): boolean {
    return this.selectedTicket?.status === 'resolved';
  }
}