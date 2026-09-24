const Shift = require('./Shift');
const asyncHandler = require('../../core/utils/asyncHandler');
const { logActivity } = require('../audit/auditService');

// @desc    Open a new shift
// @route   POST /api/shifts/open
// @access  Private
const openShift = asyncHandler(async (req, res) => {
  const { openingBalance, notes } = req.body;

  // Check if a shift is already open for this user
  const existingShift = await Shift.findOne({
    shop: req.user.shop,
    user: req.user._id,
    status: 'OPEN',
  });

  if (existingShift) {
    res.status(400);
    throw new Error('You already have an open shift. Please close it first.');
  }

  const shift = await Shift.create({
    shop: req.user.shop,
    user: req.user._id,
    openingBalance: openingBalance || 0,
    notes,
  });

  res.status(201).json(shift);
});

// @desc    Close the current shift
// @route   POST /api/shifts/close
// @access  Private
const closeShift = asyncHandler(async (req, res) => {
  const { closingBalance, notes } = req.body;

  const shift = await Shift.findOne({
    shop: req.user.shop,
    user: req.user._id,
    status: 'OPEN',
  });

  if (!shift) {
    res.status(404);
    throw new Error('No open shift found for this user.');
  }

  shift.closingBalance = closingBalance !== undefined ? closingBalance : 0;
  shift.status = 'CLOSED';
  shift.closedAt = Date.now();
  if (notes) {
    shift.notes = shift.notes ? `${shift.notes}\n${notes}` : notes;
  }

  await shift.save();

  res.json(shift);
});

// @desc    Get current open shift
// @route   GET /api/shifts/current
// @access  Private
const getCurrentShift = asyncHandler(async (req, res) => {
  const shift = await Shift.findOne({
    shop: req.user.shop,
    user: req.user._id,
    status: 'OPEN',
  });

  if (!shift) {
    res.status(404);
    throw new Error('No open shift found.');
  }

  res.json(shift);
});

// @desc    Update opening balance of the current shift (one-time)
// @route   PUT /api/shifts/open
// @access  Private
const updateOpeningBalance = asyncHandler(async (req, res) => {
  const { openingBalance } = req.body;

  const shift = await Shift.findOne({
    shop: req.user.shop,
    user: req.user._id,
    status: 'OPEN',
  });

  if (!shift) {
    res.status(404);
    throw new Error('No open shift found.');
  }

  if (shift.hasUpdatedOpeningBalance) {
    res.status(400);
    throw new Error('Starting cash can only be updated once per shift.');
  }

  const oldBalance = shift.openingBalance;
  shift.openingBalance = openingBalance;
  shift.hasUpdatedOpeningBalance = true;

  await shift.save();

  // Audit Log
  await logActivity({
    shop: req.user.shop,
    user: req.user,
    action: 'UPDATE_SHIFT_CASH',
    entityType: 'Shift',
    entityId: shift._id,
    details: {
      message: `Cashier updated starting cash from ₹${oldBalance} to ₹${openingBalance}`,
      oldBalance,
      newBalance: openingBalance
    },
    ipAddress: req.ip
  });

  res.json(shift);
});

module.exports = {
  openShift,
  closeShift,
  getCurrentShift,
  updateOpeningBalance,
};
