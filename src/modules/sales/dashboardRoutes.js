const express = require('express');
const router = express.Router();
const { getInventorySummary, getSalesSummary } = require('./dashboardController');
const { protect } = require('../../core/middlewares/authMiddleware');

router.get('/inventory', protect, getInventorySummary);
router.get('/sales', protect, getSalesSummary);

module.exports = router;
