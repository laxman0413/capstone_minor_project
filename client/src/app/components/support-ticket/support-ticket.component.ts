import { Component, OnInit, ChangeDetectorRef, NgZone, ViewChild, ElementRef, OnDestroy, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserTicketService } from '../../services/user-support.service';
import { SocketService } from '../../services/socket.service';
import { ToastrService } from 'ngx-toastr';
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
  selector: 'app-user-support-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './support-ticket.component.html',
  styleUrls: ['./support-ticket.component.css']
})
export class SupportTicketComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  tickets: UserTicket[] = [];
  newTicket = { issue: '', priority: 'low' as const };
  loading = false;
  selectedTicket: UserTicket | null = null;
  newMessage = '';
  error = '';
  private subscriptions: Subscription[] = [];
  private currentTicketId: string | null = null;
  private shouldScrollToBottom = false;
  private isSocketConnected = false;

  constructor(
    private userTicketService: UserTicketService,
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

  ngAfterViewChecked() {
    // Scroll to bottom if flag is set
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
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
          console.log('Received message:', message);
          
          // Only process messages for the currently selected ticket
          if (this.selectedTicket && message.ticketId === this.selectedTicket._id) {
            console.log('Adding message to current ticket');
            
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
              
              // Scroll to bottom immediately after new message
              this.scrollToBottom();
              
              // Play notification sound for admin messages
              if (message.sender === 'admin') {
                this.toastr.info('New message from support');
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
          console.log('Received ticket update:', update);
          
          // Update ticket in the list
          this.tickets = this.tickets.map(ticket =>
            ticket._id === update.ticketId ? { ...ticket, status: update.status } : ticket
          );
          
          // Update selected ticket if it's the one being updated
          if (this.selectedTicket?._id === update.ticketId) {
            this.selectedTicket!.status = update.status;
          }
          
          this.toastr.info(`Ticket status updated to ${update.status}`);
          this.cdRef.detectChanges();
        });
      })
    );

    // Status notification subscription
    this.subscriptions.push(
      this.socketService.listenToStatusNotifications().subscribe(notification => {
        this.ngZone.run(() => {
          console.log('Received status notification:', notification);
          this.toastr.info(notification.message);
          // Refresh tickets to show updated status
          this.loadTickets();
        });
      })
    );

    // Message notification subscription
    this.subscriptions.push(
      this.socketService.listenToMessageNotifications().subscribe(notification => {
        this.ngZone.run(() => {
          console.log('Received message notification:', notification);
          
          // Only show notification if it's not for the currently selected ticket
          if (!this.selectedTicket || notification.ticketId !== this.selectedTicket._id) {
            // Add different notifications based on sender
            if (notification.sender === 'admin') {
              this.toastr.info('New message from support', 'Support Ticket');
            } else {
              this.toastr.info(notification.message, 'New Message');
            }
            
            // Refresh tickets list to show updated message counts
            this.loadTickets();
          }
        });
      })
    );

    // Connection status subscription
    this.subscriptions.push(
      this.socketService.connectionStatus$.subscribe(isConnected => {
        this.ngZone.run(() => {
          console.log('Socket connection status:', isConnected ? 'connected' : 'disconnected');
          
          if (isConnected) {
            this.isSocketConnected = true;
            
            // Rejoin current ticket room if any
            if (this.currentTicketId) {
              console.log(`Rejoining ticket room ${this.currentTicketId} after reconnection`);
              this.socketService.joinTicketRoom(this.currentTicketId)
                .then(() => {
                  console.log(`Successfully rejoined ticket room ${this.currentTicketId}`);
                  // Reload chat history after rejoining to ensure we have the latest messages
                  if (this.currentTicketId) {
                    return this.socketService.getChatHistory(this.currentTicketId);
                  }
                  return Promise.resolve(null);
                })
                .then(history => {
                  if (history && history.length > 0 && this.selectedTicket) {
                    console.log(`Received ${history.length} messages after reconnection`);
                    this.selectedTicket.messages = history;
                    this.cdRef.detectChanges();
                    this.scrollToBottom();
                  }
                })
                .catch(err => console.error('Error rejoining room after reconnect:', err));
            }
            
            // Try to send any pending messages
            this.sendPendingMessages();
          } else {
            this.isSocketConnected = false;
            this.toastr.warning('Real-time connection lost. Trying to reconnect...');
          }
        });
      })
    );
  }

  /**
   * Attempt to send any pending messages stored in localStorage
   */
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
      // Queue the scroll operation to ensure it happens after DOM updates
      setTimeout(() => {
        // Only scroll the message container
        const element = this.messageContainer?.nativeElement;
        if (element) {
          element.scrollTop = element.scrollHeight;
          console.log('Scrolled message container to bottom');
        }
      }, 100); // Small timeout to ensure DOM is updated
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  async loadTickets() {
    try {
      this.loading = true;
      console.log('Loading tickets...');
      
      const response = await this.userTicketService.getUserTickets();
      
      if (Array.isArray(response)) {
        this.tickets = response as UserTicket[];
        console.log(`Loaded ${this.tickets.length} tickets`);
        
        // Sort tickets: open first, then in-progress, then resolved
        this.tickets.sort((a, b) => {
          const statusPriority = { open: 0, 'in-progress': 1, resolved: 2 };
          if (statusPriority[a.status] !== statusPriority[b.status]) {
            return statusPriority[a.status] - statusPriority[b.status];
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        // If we had a previously selected ticket, re-select it with updated data
        if (this.selectedTicket) {
          const updatedTicket = this.tickets.find(t => t._id === this.selectedTicket?._id);
          if (updatedTicket) {
            // Preserve messages from the current selected ticket
            const currentMessages = this.selectedTicket.messages || [];
            this.selectedTicket = updatedTicket;
            
            // Only use the messages from the updated ticket if it has messages
            if (!this.selectedTicket.messages || this.selectedTicket.messages.length === 0) {
              this.selectedTicket.messages = currentMessages;
            }
          }
        }
      } else {
        console.error('Response is not an array', response);
        this.error = 'Invalid response format from server';
        this.toastr.error('Failed to load tickets: Invalid response format');
      }
    } catch (error: any) {
      console.error('Error loading tickets', error);
      this.toastr.error('Failed to load tickets');
      this.error = 'Failed to load tickets: ' + (error.message || 'Unknown error');
    } finally {
      this.loading = false;
      this.cdRef.detectChanges();
    }
  }

  async createTicket() {
    if (!this.newTicket.issue.trim()) {
      this.toastr.warning('Please describe your issue');
      return;
    }
    try {
      this.loading = true;
      const response = await this.userTicketService.createTicket(this.newTicket);
      const ticket = response as UserTicket;
      this.tickets.unshift(ticket);
      this.newTicket.issue = '';
      this.toastr.success('Ticket created successfully');
      this.selectTicket(ticket);
    } catch (error: any) {
      this.toastr.error('Failed to create ticket');
      this.error = 'Failed to create ticket: ' + (error.message || 'Unknown error');
    } finally {
      this.loading = false;
      this.cdRef.detectChanges();
    }
  }

  async selectTicket(ticket: UserTicket) {
    try {
      console.log('Selecting ticket:', ticket._id);
      
      // Leave the current ticket room if any
      if (this.currentTicketId) {
        console.log('Leaving current ticket room:', this.currentTicketId);
        try {
          await this.socketService.leaveTicketRoom(this.currentTicketId);
          console.log('Successfully left previous ticket room');
        } catch (leaveError) {
          console.warn('Error leaving previous ticket room:', leaveError);
          // Continue anyway, as we'll join a new room
        }
      }
      
      // Store the selected ticket and ID
      this.selectedTicket = {...ticket};
      this.currentTicketId = ticket._id;
      
      // Clear any existing messages to avoid showing stale data
      if (this.selectedTicket.messages) {
        this.selectedTicket.messages = [];
      }
      
      // Ensure socket is connected before trying to join room
      let isConnected = this.isSocketConnected;
      if (!isConnected) {
        console.log('Socket not connected, attempting to reconnect');
        this.socketService.reconnect();
        
        // Wait for connection to be established with a timeout
        try {
          isConnected = await Promise.race([
            new Promise<boolean>((resolve) => {
              const subscription = this.socketService.connectionStatus$.subscribe(connected => {
                if (connected) {
                  subscription.unsubscribe();
                  resolve(true);
                }
              });
              
              // Add to cleanup list
              this.subscriptions.push(subscription);
            }),
            new Promise<boolean>((resolve) => {
              setTimeout(() => {
                resolve(false);
              }, 5000);
            })
          ]);
          
          if (isConnected) {
            console.log('Socket reconnected successfully');
            this.isSocketConnected = true;
          } else {
            console.warn('Socket reconnection failed, continuing with limited functionality');
            this.toastr.warning('Unable to establish real-time connection. Some features may be limited.', 'Connection Issue');
          }
        } catch (connectionError) {
          console.error('Error during connection attempt:', connectionError);
        }
      }
      
      // Join the new ticket room
      let joinedRoom = false;
      try {
        console.log('Attempting to join ticket room:', ticket._id);
        await this.socketService.joinTicketRoom(ticket._id);
        console.log('Successfully joined ticket room:', ticket._id);
        joinedRoom = true;
      } catch (joinError: any) {
        console.error('Error joining ticket room:', joinError);
        
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
        console.log('Fetching chat history for ticket:', ticket._id);
        const history = await this.socketService.getChatHistory(ticket._id);
        console.log('Received chat history:', history?.length || 0, 'messages');
        
        if (history && history.length > 0) {
          // Replace any existing messages with the full history
          this.selectedTicket.messages = history;
        } else if (!this.selectedTicket.messages) {
          // Ensure messages array exists even if empty
          this.selectedTicket.messages = [];
        }
      } catch (historyError: any) {
        console.error('Error loading chat history:', historyError);
        
        // If we couldn't get history but joined the room, try again once
        if (joinedRoom && isConnected) {
          try {
            console.log('Retrying chat history fetch after short delay...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryHistory = await this.socketService.getChatHistory(ticket._id);
            if (retryHistory && retryHistory.length > 0) {
              this.selectedTicket.messages = retryHistory;
            }
          } catch (retryError) {
            console.error('Retry failed to load chat history:', retryError);
            this.toastr.warning('Unable to load message history', 'Data Loading Issue');
          }
        } else {
          this.toastr.warning('Unable to load message history', 'Data Loading Issue');
        }
        
        // Continue with empty or existing messages
        if (!this.selectedTicket.messages) {
          this.selectedTicket.messages = [];
        }
      }
      
      this.cdRef.detectChanges();
      
      // Scroll to bottom after loading messages
      this.scrollToBottom();
      
    } catch (error: any) {
      console.error('Critical error selecting ticket:', error);
      this.toastr.error('Failed to load ticket data');
      this.error = 'Failed to load ticket data: ' + (error.message || 'Unknown error');
      
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
    
    try {
      // Clear input field immediately
      this.newMessage = '';
      
      // Validate ticketId
      if (!ticketId) {
        throw new Error('Invalid ticket ID');
      }
      
      console.log(`Preparing to send message for ticket: ${ticketId}`);
      
      // Create optimistic message
      const optimisticMessage: Message = {
        sender: 'user',
        message: messageText,
        timestamp: new Date(),
        ticketId: ticketId
      };
      
      // Ensure messages array exists
      if (!this.selectedTicket.messages) {
        this.selectedTicket.messages = [];
      }
      
      // Add message to UI immediately
      this.selectedTicket.messages.push(optimisticMessage);
      this.cdRef.detectChanges();
      
      // Scroll to bottom immediately after adding message to UI
      this.scrollToBottom();
      
      // Ensure socket is connected
      if (!this.isSocketConnected) {
        console.log('Socket not connected, attempting to reconnect before sending message');
        this.socketService.reconnect();
        
        // Wait for connection to be established with a timeout
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
          console.warn('Failed to establish socket connection, storing message locally');
          this.toastr.warning('Message saved locally. It will be sent when connection is restored.', 'Offline Mode');
          
          // Store the message in localStorage for later sending
          const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
          pendingMessages.push({
            ticketId: ticketId,
            message: messageText,
            timestamp: new Date()
          });
          localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
          
          // Don't throw an error, as we've handled it gracefully
          return;
        }
        
        this.isSocketConnected = true;
      }
      
      // Double-check that we're in the correct ticket room
      if (!this.socketService.isInTicketRoom(ticketId)) {
        console.log(`Not in ticket room ${ticketId}, attempting to join before sending message`);
        try {
          await this.socketService.joinTicketRoom(ticketId);
          console.log(`Successfully joined ticket room ${ticketId} before sending message`);
        } catch (joinError) {
          console.error(`Failed to join ticket room ${ticketId} before sending message:`, joinError);
          // Continue anyway and try to send the message
        }
      }
      
      // Send message to server with correct recipient and ticketId
      await this.socketService.sendMessage({
        recipient: 'admin',  // Explicitly set recipient to 'admin'
        message: messageText,
        ticketId: ticketId
      });
      
      console.log('User message sent successfully');
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Don't remove the optimistic message, but mark it as pending
      if (this.selectedTicket?.messages) {
        const index = this.selectedTicket.messages.findIndex(m => 
          m.message === messageText && m.sender === 'user' && 
          Math.abs(new Date().getTime() - new Date(m.timestamp).getTime()) < 5000
        );
        
        if (index !== -1) {
          // Add a visual indicator that the message is pending
          this.selectedTicket.messages[index].message += ' (pending)';
          this.cdRef.detectChanges();
        }
      }
      
      // Store the message in localStorage for later sending
      const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
      pendingMessages.push({
        ticketId: this.selectedTicket._id,
        message: messageText,
        timestamp: new Date()
      });
      localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
      
      // Try to reconnect socket
      this.isSocketConnected = false;
      this.socketService.reconnect();
      
      this.toastr.warning('Message saved locally. It will be sent when connection is restored.', 'Connection Issue');
    }
  }

  isTicketResolved(): boolean {
    return this.selectedTicket?.status === 'resolved';
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }

  getPriorityClass(priority: string): string {
    return priority.toLowerCase();
  }
}
