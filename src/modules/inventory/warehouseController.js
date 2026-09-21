const Warehouse = require('./Warehouse');
const asyncHandler = require('../../core/utils/asyncHandler');

// @desc    Get all warehouses
// @route   GET /api/warehouses
// @access  Private
const getWarehouses = asyncHandler(async (req, res) => {
  const warehouses = await Warehouse.find({ shop: req.user.shop, isActive: true });
  res.json(warehouses);
});

// @desc    Create a new warehouse
// @route   POST /api/warehouses
// @access  Private
const createWarehouse = asyncHandler(async (req, res) => {
  const { name, location } = req.body;
  
  const warehouseExists = await Warehouse.findOne({ name, shop: req.user.shop });
  if (warehouseExists) {
    res.status(400);
    throw new Error('Warehouse with this name already exists in your shop');
  }

  // If this is the first warehouse, make it default
  const count = await Warehouse.countDocuments({ shop: req.user.shop });
  const isDefault = count === 0;

  const warehouse = await Warehouse.create({
    name,
    location,
    isDefault,
    shop: req.user.shop
  });

  res.status(201).json(warehouse);
});

// @desc    Update a warehouse
// @route   PUT /api/warehouses/:id
// @access  Private
const updateWarehouse = asyncHandler(async (req, res) => {
  const { name, location, isDefault } = req.body;
  
  const warehouse = await Warehouse.findOne({ _id: req.params.id, shop: req.user.shop });
  
  if (warehouse && warehouse.isActive) {
    warehouse.name = name || warehouse.name;
    warehouse.location = location !== undefined ? location : warehouse.location;
    
    if (isDefault) {
      // Unset default on all others
      await Warehouse.updateMany({ shop: req.user.shop }, { isDefault: false });
      warehouse.isDefault = true;
    }

    const updatedWarehouse = await warehouse.save();
    res.json(updatedWarehouse);
  } else {
    res.status(404);
    throw new Error('Warehouse not found');
  }
});

// @desc    Delete a warehouse
// @route   DELETE /api/warehouses/:id
// @access  Private
const deleteWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findOne({ _id: req.params.id, shop: req.user.shop });
  
  if (warehouse && warehouse.isActive) {
    if (warehouse.isDefault) {
      res.status(400);
      throw new Error('Cannot delete the default warehouse');
    }
    
    warehouse.isActive = false;
    await warehouse.save();
    res.json({ message: 'Warehouse removed' });
  } else {
    res.status(404);
    throw new Error('Warehouse not found');
  }
});

module.exports = {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
};
