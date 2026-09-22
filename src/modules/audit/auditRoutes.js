const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('./auditController');
const { protect, authorize } = require('../../core/middlewares/authMiddleware');

router.get('/', protect, authorize('Admin'), getAuditLogs);

module.exports = router;
