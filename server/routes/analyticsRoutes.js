const express = require('express');
const router = express();
const protect = require('../middlewares/authMiddleware');
const admin = require('../middlewares/adminMiddleware');
const {
  // getDocumentStats,
  // getDocumentTypeDistribution,
  // getPIIStats,
  // getRecentActivities,
  getAdminAnalytics,
  getFullAdminAnalytics,
  // getAnalyticsData
  getDocumentMetrics,
  getUserActivityLogs,
  getAdminActivityLogs
} = require('../controllers/analyticsController');

// User analytics routes
router.get('/user-metrics', protect, getDocumentMetrics);
router.get('/activity-logs', protect, getUserActivityLogs);
// router.get('/user-metrics', protect, getDocumentStats);
// router.get('/document-types', protect, getDocumentTypeDistribution);
// router.get('/pii-stats', protect, getPIIStats);
// router.get('/activities', protect, getRecentActivities);
// router.get('/analytics', protect, getAnalyticsData);

// Admin analytics routes
router.get('/admin/analytics/documents', protect, admin, getAdminAnalytics);
router.get('/admin/analytics/full', protect, admin, getFullAdminAnalytics);
router.get('/admin/analytics/activity-logs', protect, admin, getAdminActivityLogs);

module.exports = router; 