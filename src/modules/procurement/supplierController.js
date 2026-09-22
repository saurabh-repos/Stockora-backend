const Supplier = require('./Supplier');
const asyncHandler = require('../../core/utils/asyncHandler');
// @desc    Get all suppliers
// @route   GET /api/procurement/suppliers
// @access  Private
const getSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find({ shop: req.user.shop }).sort({ createdAt: -1 });
  res.json(suppliers);
});

// @desc    Create a new supplier
// @route   POST /api/procurement/suppliers
// @access  Private
const createSupplier = asyncHandler(async (req, res) => {
  const { name, contactPerson, email, phone, address, taxId, status } = req.body;

  const supplier = new Supplier({
    name,
    contactPerson,
    email,
    phone,
    address,
    taxId,
    status: status || 'Active',
    shop: req.user.shop
  });

  const createdSupplier = await supplier.save();
  res.status(201).json(createdSupplier);
});

// @desc    Update a supplier
// @route   PUT /api/procurement/suppliers/:id
// @access  Private
const updateSupplier = asyncHandler(async (req, res) => {
  const { name, contactPerson, email, phone, address, taxId, status } = req.body;

  const supplier = await Supplier.findOne({ _id: req.params.id, shop: req.user.shop });

  if (supplier) {
    supplier.name = name || supplier.name;
    supplier.contactPerson = contactPerson || supplier.contactPerson;
    supplier.email = email || supplier.email;
    supplier.phone = phone || supplier.phone;
    supplier.address = address || supplier.address;
    supplier.taxId = taxId || supplier.taxId;
    supplier.status = status || supplier.status;

    const updatedSupplier = await supplier.save();
    res.json(updatedSupplier);
  } else {
    res.status(404);
    throw new Error('Supplier not found');
  }
});

// @desc    Delete a supplier
// @route   DELETE /api/procurement/suppliers/:id
// @access  Private
const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, shop: req.user.shop });

  if (supplier) {
    await supplier.deleteOne();
    res.json({ message: 'Supplier removed' });
  } else {
    res.status(404);
    throw new Error('Supplier not found');
  }
});

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
