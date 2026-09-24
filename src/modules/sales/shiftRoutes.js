const express = require('express');
const router = express.Router();
const { openShift, closeShift, getCurrentShift, updateOpeningBalance } = require('./shiftController');
const { protect } = require('../../core/middlewares/authMiddleware');

router.post('/open', protect, openShift);
router.put('/open', protect, updateOpeningBalance);
router.post('/close', protect, closeShift);
router.get('/current', protect, getCurrentShift);

module.exports = router;
