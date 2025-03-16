const Document = require('../models/Document');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require("../models/User");
const dataModel = require('../models/dataReceiver');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Get document usage metrics for the current user
 * @route   GET /api/analytics/document-metrics
 * @access  Private
 */
exports.getDocumentMetrics = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const currentYear = new Date().getFullYear();
  const currentMonthStart = new Date(currentYear, new Date().getMonth(), 1);

  // Get total documents
  const totalDocuments = await Document.countDocuments({ userId });

  // Get documents uploaded this month
  const documentsThisMonth = await Document.countDocuments({
    userId,
    uploadedAt: { $gte: currentMonthStart }
  });

  // Get document uploads per month (12 values for current year)
  const documentUploadsPerMonth = await Document.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        uploadedAt: {
          $gte: new Date(currentYear, 0, 1), // Start of the current year
          $lt: new Date(currentYear + 1, 0, 1) // Start of next year
        }
      }
    },
    {
      $group: {
        _id: { month: { $month: "$uploadedAt" } },
        count: { $sum: 1 }
      }
    }
  ]);
  console.log(documentUploadsPerMonth);
  // Convert aggregation result to a 12-element array with 0s where necessary
  const documentDate = Array(12).fill(0);
  documentUploadsPerMonth.forEach(doc => {
    documentDate[doc._id.month - 1] = doc.count; // Months are 1-based, so subtract 1 for zero-based index
  });
console.log(documentDate);
  // Get document type distribution
  const documentTypes = await Document.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$documentType", count: { $sum: 1 } } }
  ]);

  const documentsProcessed = {
    adhaar: 0,
    pan: 0,
    driving_license: 0,
    other: 0
  };

  documentTypes.forEach(doc => {
    documentsProcessed[doc._id] = doc.count || 0;
  });

  // Placeholder values for saved vs direct downloads (Assuming these are tracked in another way)
  const savedVsDirectDownloads = {
    saved: 0, // This should be fetched from relevant tracking data
    directDownloads: 0 // This should be fetched from relevant tracking data
  };

  // Placeholder for total storage used (assuming document sizes are tracked elsewhere)
  const totalStorageUsed = 0; // This should be calculated based on stored document sizes

  res.status(200).json({
    totalDocuments,
    documentsThisMonth,
    documentDate, // Now correctly represents 12 months
    documentsProcessed,
    savedVsDirectDownloads,
    totalStorageUsed
  });
});



/**
 * @desc    Get admin analytics data for documents
 * @route   GET /api/admin/analytics/documents
 * @access  Admin
 */
exports.getAdminAnalytics = asyncHandler(async (req, res) => {
  try {
    // Get total documents
    const totalDocuments = await Document.countDocuments();

    // Get document type distribution
    const documentTypes = await Document.aggregate([
      { $group: { _id: "$documentType", count: { $sum: 1 } } }
    ]);

    // Format the response to match the expected client format
    const response = {
      documents: {
        total: totalDocuments,
        byType: documentTypes
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getAdminAnalytics:', error);
    res.status(500).json({ message: 'Server error while fetching analytics' });
  }
});

/**
 * @desc    Get full admin analytics data
 * @route   GET /api/admin/analytics/full
 * @access  Admin
 */
exports.getFullAdminAnalytics = asyncHandler(async (req, res) => {
  // Total users
  const totalUsers = await User.countDocuments();
  
  // Total documents
  const totalDocuments = await Document.countDocuments();
  
  // Total masked documents (count where maskedFileName is not null)
  const maskedDocuments = await Document.countDocuments();
  
  // Total shared texts
  const sharedTexts = await dataModel.countDocuments();
  
  // Total encrypted texts
  const encryptedTexts = await dataModel.countDocuments();
  
  // User growth (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: { 
          month: { $month: "$createdAt" }, 
          year: { $year: "$createdAt" } 
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  // Document uploads (last 6 months)
  const documentUploads = await Document.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: { 
          month: { $month: "$createdAt" }, 
          year: { $year: "$createdAt" } 
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Document type distribution
  const documentTypes = await Document.aggregate([
    { $group: { _id: "$documentType", count: { $sum: 1 } } }
  ]);

  // Daily document uploads (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const dailyDocumentUploads = await Document.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: { 
          day: { $dayOfMonth: "$createdAt" },
          month: { $month: "$createdAt" }, 
          year: { $year: "$createdAt" } 
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
  ]);

  // User activity by hour of day
  const userActivityByHour = await Document.aggregate([
    {
      $group: {
        _id: { hour: { $hour: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.hour": 1 } }
  ]);

  // Masked vs Unmasked documents ratio
  const maskedVsUnmaskedRatio = {
    masked: maskedDocuments,
    unmasked: totalDocuments - maskedDocuments
  };

  // Top active users (users with most documents)
  const topActiveUsers = await Document.aggregate([
    {
      $group: {
        _id: "$userId",
        documentCount: { $sum: 1 }
      }
    },
    { $sort: { documentCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userDetails"
      }
    },
    {
      $project: {
        _id: 1,
        documentCount: 1,
        user: { $arrayElemAt: ["$userDetails", 0] }
      }
    },
    {
      $project: {
        _id: 1,
        documentCount: 1,
        "user.name": 1,
        "user.email": 1
      }
    }
  ]);

  res.status(200).json({
    totalUsers,
    totalDocuments,
    maskedDocuments,
    sharedTexts,
    encryptedTexts,
    userGrowth,
    documentUploads,
    documentTypes,
    dailyDocumentUploads,
    userActivityByHour,
    maskedVsUnmaskedRatio,
    topActiveUsers
  });
});

/**
 * @desc    Get user activity logs
 * @route   GET /api/analytics/activity-logs
 * @access  Private
 */
exports.getUserActivityLogs = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  try {
    // Get total count for pagination
    const totalLogs = await ActivityLog.countDocuments({ userId });
    
    // Get activity logs with pagination
    const activityLogs = await ActivityLog.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('documentId', 'originalName documentType')
      .populate('textId');
    
    res.status(200).json({
      activityLogs,
      pagination: {
        totalLogs,
        totalPages: Math.ceil(totalLogs / limit),
        currentPage: page,
        hasMore: page < Math.ceil(totalLogs / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Server error while fetching activity logs' });
  }
});

/**
 * @desc    Get admin activity logs for all users
 * @route   GET /api/admin/analytics/activity-logs
 * @access  Admin
 */
exports.getAdminActivityLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const userId = req.query.userId; // Optional filter by user
  
  try {
    // Build query
    const query = userId ? { userId } : {};
    
    // Get total count for pagination
    const totalLogs = await ActivityLog.countDocuments(query);
    
    // Get activity logs with pagination
    const activityLogs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('documentId', 'originalName documentType')
      .populate('textId');
    
    res.status(200).json({
      activityLogs,
      pagination: {
        totalLogs,
        totalPages: Math.ceil(totalLogs / limit),
        currentPage: page,
        hasMore: page < Math.ceil(totalLogs / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin activity logs:', error);
    res.status(500).json({ message: 'Server error while fetching activity logs' });
  }
});
