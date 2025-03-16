const jwt = require('jsonwebtoken');

module.exports = (socket, next) => {
  try {
    console.log('Socket authentication attempt');
    
    // Check if auth object exists
    if (!socket.handshake.auth) {
      console.log('Socket authentication failed: No auth object in handshake');
      return next(new Error('Authentication error: No auth data provided'));
    }
    
    const token = socket.handshake.auth.token;
    
    // Log token presence (not the actual token for security)
    console.log(`Token present: ${!!token}`);
    if (token) {
      console.log(`Token length: ${token.length}`);
    }
    
    if (!token) {
      console.log('Socket authentication failed: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure user object has all required fields
    if (!decoded.id) {
      console.log('Socket authentication failed: Token missing user ID');
      return next(new Error('Authentication error: Invalid token format'));
    }
    
    // Log successful authentication
    console.log(`Socket authenticated for user: ${decoded.id}, role: ${decoded.role || 'user'}`);
    
    // Attach user info to socket
    socket.user = {
      id: decoded.id,
      role: decoded.role || 'user'
    };
    
    // Log connection details
    console.log('Socket connection details:');
    console.log(`- Transport: ${socket.conn.transport.name}`);
    console.log(`- Remote Address: ${socket.conn.remoteAddress}`);
    console.log(`- Socket ID: ${socket.id}`);
    
    next();
  } catch (err) {
    console.log('Socket authentication failed:', err.message);
    
    // Provide more specific error messages based on the error type
    if (err.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    } else if (err.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    } else {
      return next(new Error(`Authentication error: ${err.message}`));
    }
  }
};