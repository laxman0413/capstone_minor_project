const express = require('express');
const router = express();
const Ticket = require('../models/Ticket');
const auth = require('../middlewares/authMiddleware');

// Create a new ticket
router.post('/', auth, async (req, res) => {
  try {
    const ticket = new Ticket({
      user: req.userId,
      issue: req.body.issue,
      priority: req.body.priority
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Error creating ticket' });
  }
});

// Get user's tickets
router.get('/user', auth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.userId })
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Error fetching tickets' });
  }
});

// Get ticket messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket.messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

module.exports = router;