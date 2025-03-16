const socketAuth = require('../middlewares/socketAuth');
const Ticket = require('../models/Ticket');
const debug = require('debug')('app:socket');

module.exports = (io) => {
  // Add CORS configuration to Socket.io
  io.engine.on("headers", (headers, req) => {
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    headers["Access-Control-Allow-Credentials"] = true;
  });

  // Add middleware for authentication
  io.use(socketAuth);

  // Handle connection errors at the server level
  io.engine.on("connection_error", (err) => {
    console.error("Connection error:", err.code, err.message, err.context);
  });
  
  // Handle transport errors
  io.engine.on("transport_error", (err) => {
    console.error("Transport error:", err.code, err.message, err.context);
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.id, 'Role:', socket.user.role);
    console.log('Transport used:', socket.conn.transport.name);
    

    // Create a user-specific room
    const userRoom = `user_${String(socket.user.id)}`;
    socket.join(userRoom);
    console.log(`User ${socket.user.id} joined room: ${userRoom}`);

    // If user is admin, join admin room
    if (socket.user.role === 'admin') {
      socket.join('admin');
      console.log(`Admin ${socket.user.id} joined admin room`);
    }

    // Send connection acknowledgment
    socket.emit('connectionAcknowledged', { 
      userId: socket.user.id, 
      role: socket.user.role,
      timestamp: new Date(),
      socketId: socket.id,
      transport: socket.conn.transport.name
    });

    // Handle ping requests for connection health checks
    socket.on('ping', (data, callback) => {
      console.log(`Received ping from user ${socket.user.id}`);
      if (typeof callback === 'function') {
        callback({ pong: true, timestamp: new Date() });
      } else {
        socket.emit('pong', { timestamp: new Date() });
      }
    });
    
    // Handle transport changes
    socket.conn.on('upgrade', (transport) => {
      console.log(`Transport upgraded for user ${socket.user.id} to ${transport}`);
    });
    
    // Handle errors
    socket.conn.on('error', (err) => {
      console.error(`Socket connection error for user ${socket.user.id}:`, err);
    });
    
    // Handle packet errors
    socket.conn.on('packet', (packet) => {
      if (packet.type === 'error') {
        console.error(`Packet error for user ${socket.user.id}:`, packet.data);
      }
    });

    // Handle joining specific ticket rooms
    socket.on('joinTicketRoom', async (data, callback) => {
      try {
        const ticketId = data.ticketId;
        if (!ticketId) {
          const error = { message: 'Ticket ID is required' };
          socket.emit('error', error);
          if (typeof callback === 'function') callback({ error: error.message });
          return;
        }

        console.log(`User ${socket.user.id} attempting to join ticket room: ${ticketId}`);

        // Check if ticket exists and user has access
        const ticket = await Ticket.findById(ticketId).populate('user', 'name email');
        if (!ticket) {
          const error = { message: 'Ticket not found' };
          socket.emit('error', error);
          if (typeof callback === 'function') callback({ error: error.message });
          return;
        }

        // Get the ticket owner ID (support both user and userId fields)
        let ticketOwnerId;
        
        if (ticket.user && typeof ticket.user === 'object' && ticket.user._id) {
          // If user is populated as an object
          ticketOwnerId = ticket.user._id;
        } else if (ticket.user) {
          // If user is just the ID
          ticketOwnerId = ticket.user;
        } else if (ticket.userId) {
          // Fallback to userId if available
          ticketOwnerId = ticket.userId;
        }
        
        // Convert IDs to strings for comparison
        const userId = String(socket.user.id);
        const ticketUserId = ticketOwnerId ? String(ticketOwnerId) : '';

        // Check if user has access to this ticket
        const isAdmin = socket.user.role === 'admin';
        const isTicketOwner = userId === ticketUserId;
        
        if (!isAdmin && !isTicketOwner) {
          const error = { message: 'Unauthorized access to ticket' };
          socket.emit('error', error);
          if (typeof callback === 'function') callback({ error: error.message });
          return;
        }

        // Join the ticket-specific room
        const ticketRoom = `ticket_${String(ticketId)}`;
        socket.join(ticketRoom);
        console.log(`User ${socket.user.id} joined ticket room: ${ticketRoom}`);
        
        // Send confirmation
        socket.emit('joinedTicketRoom', { ticketId });
        if (typeof callback === 'function') callback({ success: true, ticketId });
      } catch (error) {
        console.error('Error joining ticket room:', error);
        socket.emit('error', { message: 'Failed to join ticket room' });
        if (typeof callback === 'function') callback({ error: 'Failed to join ticket room' });
      }
    });

    // Handle leaving specific ticket rooms
    socket.on('leaveTicketRoom', async (data, callback) => {
      try {
        const ticketId = data.ticketId;
        if (!ticketId) {
          console.log('Missing ticketId in leaveTicketRoom event');
          if (typeof callback === 'function') {
            callback({ error: 'Ticket ID is required' });
          }
          return;
        }

        const ticketRoom = `ticket_${String(ticketId)}`;
        socket.leave(ticketRoom);
        console.log(`User ${socket.user.id} left ticket room: ${ticketRoom}`);
        
        // Send acknowledgment if callback is provided
        if (typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (error) {
        console.error('Error leaving ticket room:', error);
        if (typeof callback === 'function') {
          callback({ error: 'Failed to leave ticket room' });
        }
      }
    });

    socket.on('sendMessage', async (data, callback) => {
      try {
        // Enhanced logging for message debugging
        console.log('Message received:', {
          from: socket.user.id,
          role: socket.user.role,
          ticketId: data.ticketId,
          recipient: data.recipient,
          messagePreview: data.message.substring(0, 30) + (data.message.length > 30 ? '...' : '')
        });
        
        // Validate ticketId is provided
        if (!data.ticketId) {
          console.error('Missing ticketId in message data');
          const error = { message: 'Ticket ID is required' };
          socket.emit('error', error);
          if (typeof callback === 'function') callback({ error: error.message });
          return;
        }
        
        // Find the ticket and check if it exists
        const ticket = await Ticket.findById(data.ticketId);
        if (!ticket) {
          console.error('Ticket not found:', data.ticketId);
          const error = { message: 'Ticket not found' };
          socket.emit('error', error);
          if (typeof callback === 'function') callback({ error: error.message });
          return;
        }

        // Check ticket status - don't allow messages for resolved tickets
        if (ticket.status === 'resolved') {
          console.error('Cannot send message to resolved ticket:', data.ticketId);
          const error = { message: 'Cannot send messages to resolved tickets' };
          socket.emit('error', error);
          if (typeof callback === 'function') callback({ error: error.message });
          return;
        }

        // Get the ticket owner ID (support both user and userId fields)
        let ticketOwnerId;
        
        if (ticket.user && typeof ticket.user === 'object' && ticket.user._id) {
          // If user is populated as an object
          ticketOwnerId = ticket.user._id;
        } else if (ticket.user) {
          // If user is just the ID
          ticketOwnerId = ticket.user;
        } else if (ticket.userId) {
          // Fallback to userId if available
          ticketOwnerId = ticket.userId;
        }
        
        if (!ticketOwnerId) {
          console.error('Cannot determine ticket owner for ticket:', data.ticketId);
          const error = { message: 'Invalid ticket data' };
          socket.emit('error', error);
          if (typeof callback === 'function') callback({ error: error.message });
          return;
        }

        // Convert IDs to strings for comparison
        const userId = String(socket.user.id);
        const ticketUserId = String(ticketOwnerId);
        
        // Verify user has access to this ticket (either admin or ticket owner)
        const isAdmin = socket.user.role === 'admin';
        const isTicketOwner = userId === ticketUserId;
        
        if (!isAdmin && !isTicketOwner) {
          console.log('Message denied: User is neither admin nor ticket owner');
          console.log('User ID:', userId, 'Ticket Owner ID:', ticketUserId);
          const error = { message: 'Unauthorized access to ticket' };
          socket.emit('error', error);
          if (typeof callback === 'function') callback({ error: error.message });
          return;
        }

        // Create and format the message
        const message = {
          sender: socket.user.role === 'admin' ? 'admin' : 'user',
          message: data.message,
          timestamp: new Date(),
          ticketId: ticket._id
        };
        
        // Save message to database
        ticket.messages.push(message);
        await ticket.save();
        console.log('Message saved to database for ticket:', data.ticketId);

        // Send message to the specific ticket room
        const ticketRoom = `ticket_${String(ticket._id)}`;
        console.log('Broadcasting message to ticket room:', ticketRoom);
        io.to(ticketRoom).emit('chatMessage', message);
        
        // Send real-time notifications to the appropriate recipients
        if (socket.user.role === 'admin') {
          // Admin sending to user - send notification to the ticket owner's room
          console.log('Admin sending notification to user:', ticketUserId);
          io.to(`user_${ticketUserId}`).emit('messageNotification', {
            ticketId: ticket._id,
            message: 'New message from support',
            sender: 'admin'
          });
        } else {
          // User sending to admin - send notification to all admins
          console.log('User sending notification to admin room');
          io.to('admin').emit('messageNotification', {
            ticketId: ticket._id,
            message: 'New message from user',
            userId: socket.user.id,
            sender: 'user'
          });
        }
        
        // Send success acknowledgment to the sender
        console.log('Message processing complete, sending acknowledgment');
        if (typeof callback === 'function') {
          callback({ success: true, messageId: message._id });
        }
      } catch (error) {
        console.error('Socket message error:', error);
        const errorMessage = error.message || 'An unknown error occurred';
        socket.emit('error', { message: 'Failed to send message: ' + errorMessage });
        if (typeof callback === 'function') {
          callback({ error: 'Failed to send message: ' + errorMessage });
        }
      }
    });

    socket.on('updateTicketStatus', async (data) => {
      try {
        const ticket = await Ticket.findById(data.ticketId);
        if (!ticket || socket.user.role !== 'admin') {
          socket.emit('error', { message: 'Unauthorized or ticket not found' });
          return;
        }

        ticket.status = data.status;
        await ticket.save();

        // Get the ticket owner ID (support both user and userId fields)
        const ticketOwnerId = ticket.user || ticket.userId;

        // Send update to the specific ticket room
        const ticketRoom = `ticket_${String(ticket._id)}`;
        io.to(ticketRoom).emit('ticketUpdate', {
          ticketId: ticket._id,
          status: ticket.status
        });
        
        // Also notify the ticket owner
        io.to(`user_${String(ticketOwnerId)}`).emit('statusNotification', {
          ticketId: ticket._id,
          status: ticket.status,
          message: `Ticket status updated to ${ticket.status}`
        });
      } catch (error) {
        console.error('Status update error:', error);
        socket.emit('error', { message: 'Failed to update ticket status' });
      }
    });

    socket.on('getChatHistory', async (data, callback) => {
      try {
        const ticket = await Ticket.findById(data.ticketId);
        if (!ticket) {
          callback({ error: 'Ticket not found' });
          return;
        }

        // Get the ticket owner ID (support both user and userId fields)
        const ticketOwnerId = ticket.user || ticket.userId;

        // Convert IDs to strings for comparison
        const userId = String(socket.user.id);
        const ticketUserId = String(ticketOwnerId);
        
        // Verify user has access to this ticket (either admin or ticket owner)
        const isAdmin = socket.user.role === 'admin';
        const isTicketOwner = userId === ticketUserId;
        
        if (!isAdmin && !isTicketOwner) {
          console.log('Chat history access denied: User is neither admin nor ticket owner');
          callback({ error: 'Unauthorized access to ticket' });
          return;
        }

        callback({ history: ticket.messages });
      } catch (error) {
        console.error('Error fetching chat history:', error);
        callback({ error: 'Failed to fetch chat history' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user?.id || 'Unknown');
    });
  });
};
