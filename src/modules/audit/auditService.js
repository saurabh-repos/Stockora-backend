const AuditLog = require('./AuditLog');

/**
 * Log an activity event to the audit trail.
 *
 * @param {Object} options
 * @param {string} options.shop - Shop ID
 * @param {Object} [options.user] - User object (has _id, name)
 * @param {string} options.action - Action constant (e.g. 'CREATE_PRODUCT')
 * @param {string} [options.entityType] - Model name (e.g. 'Product')
 * @param {string} [options.entityId] - ID of affected document
 * @param {Object} [options.details] - Extra info about the change
 * @param {string} [options.ipAddress] - Request IP
 */
const logActivity = async ({ shop, user, action, entityType, entityId, details = {}, ipAddress }) => {
  try {
    await AuditLog.create({
      shop,
      user: user?._id || null,
      userName: user?.name || 'System',
      action,
      entityType,
      entityId,
      details,
      ipAddress,
    });
  } catch (err) {
    // Non-critical: log to console but don't crash the request
    console.error('[AuditLog] Failed to write audit log:', err.message);
  }
};

module.exports = { logActivity };
