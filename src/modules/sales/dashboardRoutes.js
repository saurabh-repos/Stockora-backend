const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('./dashboardController');
const { protect } = require('../../core/middlewares/authMiddleware');

router.get('/summary', protect, getDashboardSummary);

module.exports = router;
