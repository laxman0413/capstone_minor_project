const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const admin = async (req, res, next) => {
  try {
    if (!req.headers.authorization?.startsWith('Bearer')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const adminUser = await Admin.findById(decoded.id).select('-password');
    if (!adminUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.admin = adminUser;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = admin;