const Shift = require('./Shift');
const asyncHandler = require('../../core/utils/asyncHandler');

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

module.exports = {
  openShift,
  closeShift,
  getCurrentShift,
};
