const AuditLog = require('./AuditLog');
const asyncHandler = require('../../core/utils/asyncHandler');

// @desc    Get audit logs for the shop
// @route   GET /api/audit-logs
// @access  Private (Admin)
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, entityType, userId } = req.query;

  const filter = { shop: req.user.shop };

  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (userId) filter.user = userId;

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'name email role'),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    logs,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

module.exports = { getAuditLogs };
