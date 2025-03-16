const Admin = require('../models/Admin');
const Document = require('../models/Document');
const User=require('../models/User');
const Ticket = require('../models/Ticket');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const admin = await Admin.findOne({email});
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const hashedPassword=admin.password;
    const isMatch = await bcrypt.compare(password, hashedPassword);
    console.log("1",hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Dashboard Analytics
exports.getDocumentAnalytics = async (req, res) => {
  try {
    // Document statistics
    const totalDocuments = await Document.countDocuments();
    const documentTypes = await Document.aggregate([
      { $group: { _id: '$documentType', count: { $sum: 1 } } }
    ]);

    res.json({
      documents: {
        total: totalDocuments,
        byType: documentTypes
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


// Get Support Tickets
exports.getSupportTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    console.log('Fetched tickets:', tickets.map(t => ({
      id: t._id,
      user: t.user,
      userId: t.userId,
      issue: t.issue
    })));
    
    res.status(200).json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reply to Support Ticket
exports.replyToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.messages.push({
      sender: 'admin',
      message,
      timestamp: new Date()
    });
    ticket.status = 'in-progress';
    ticket.updatedAt = new Date();

    await ticket.save();
    res.status(200).json(ticket);
  } catch (error) {
    console.error('Error replying to ticket:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Ticket Status
exports.updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.status(200).json(ticket);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyUserPii = async (req, res) => {
  try {
    const { email, DocType, DocNumber } = req.body;

    // 1. Find the user by email
    const user = await User.findOne({ email }); // Fix: Use findOne() and await
    if (!user) {
      return res.status(404).send({ message: "User not found!" });
    }

    // 2. Find the document linked to the user
    const document = await Document.findOne({ userId: user._id, documentType: DocType });
    console.log(document);
    if (!document) {
      return res.status(404).send({ message: "No Document Found in Database" });
    }

    // 3. Hash the provided DocNumber and compare with stored piiHash
    console.log(typeof(DocNumber));
    const piiHash = crypto.createHash('sha256').update(DocNumber).digest('hex');
    console.log(piiHash,document.piiHash)
    if (piiHash === document.piiHash) {
      return res.status(200).send({ message: "User verified Successfully!" });
    } else {
      return res.status(401).send({ message: "User is Not Verified!" });
    }

  } catch (err) {
    console.error("Error verifying user PII:", err);
    res.status(500).json({ message: 'Server error' });
  }
};