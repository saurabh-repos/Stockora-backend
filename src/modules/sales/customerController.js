const Customer = require('./Customer');
const asyncHandler = require('../../core/utils/asyncHandler');
// @desc    Get all active customers
// @route   GET /api/customers
// @access  Private
const getCustomers = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword
    ? {
        name: { $regex: req.query.keyword, $options: 'i' },
      }
    : {};

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const filter = { ...keyword, shop: req.user.shop, isActive: true };
  const total = await Customer.countDocuments(filter);

  const customers = await Customer.find(filter)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  res.json({
    data: customers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, email, address, gstNumber, notes } = req.body;
  
  // Phone should generally be unique per shop if provided, but we'll just check name for MVP
  const customerExists = await Customer.findOne({ name, shop: req.user.shop });
  
  if (customerExists) {
    res.status(400);
    throw new Error('Customer with this name already exists in your CRM');
  }

  const customer = await Customer.create({
    shop: req.user.shop,
    name,
    phone,
    email,
    address,
    gstNumber,
    notes
  });

  res.status(201).json(customer);
});

module.exports = {
  getCustomers,
  createCustomer,
};
