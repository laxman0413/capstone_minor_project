const ActivityLog = require('../models/ActivityLog');

/**
 * Log user activity
 * @param {string} userId - User ID
 * @param {string} type - Activity type (upload, mask, share, delete, encrypt, decrypt)
 * @param {string} text - Description of the activity
 * @param {Object} options - Additional options
 * @param {string} [options.documentId] - Document ID if activity is related to a document
 * @param {string} [options.textId] - Text ID if activity is related to shared text
 * @param {Object} [options.metadata] - Additional metadata about the activity
 * @returns {Promise<Object>} - Created activity log
 */
const logActivity = async (userId, type, text, options = {}) => {
  try {
    const { documentId, textId, metadata } = options;
    
    const activityLog = new ActivityLog({
      userId,
      type,
      text,
      documentId,
      textId,
      metadata
    });
    
    await activityLog.save();
    return activityLog;
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw the error to prevent disrupting the main flow
    return null;
  }
};

module.exports = { logActivity }; 