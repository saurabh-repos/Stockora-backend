const Product = require('./Product');
const asyncHandler = require('../../core/utils/asyncHandler');

// @desc    Get all active products (with optional search)
// @route   GET /api/products
// @access  Private
const getProducts = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { sku: { $regex: req.query.keyword, $options: 'i' } },
          { barcode: { $regex: req.query.keyword, $options: 'i' } },
        ],
      }
    : {};

  const filter = { ...keyword, isActive: true, shop: req.user.shop };

  // Filter by specific warehouse if provided
  if (req.query.warehouseId) {
    filter['stockLocations.warehouse'] = req.query.warehouseId;
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('stockLocations.warehouse', 'name')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  res.json({
    data: products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, shop: req.user.shop })
    .populate('stockLocations.warehouse', 'name');

  if (product && product.isActive) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private
const createProduct = asyncHandler(async (req, res) => {
  const { 
    name, category, brand, sku, barcode, unit, 
    purchasePrice, sellingPrice, mrp, gstPercent, 
    minimumStock, boxCoverage, images 
  } = req.body;

  const product = new Product({
    name, category, brand, sku, barcode, unit, 
    purchasePrice, sellingPrice, mrp, gstPercent, 
    minimumStock, boxCoverage, images,
    shop: req.user.shop
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = asyncHandler(async (req, res) => {
  const { 
    name, category, brand, sku, barcode, unit, 
    purchasePrice, sellingPrice, mrp, gstPercent, 
    minimumStock, boxCoverage, images 
  } = req.body;

  const product = await Product.findOne({ _id: req.params.id, shop: req.user.shop });

  if (product && product.isActive) {
    product.name = name || product.name;
    product.category = category || product.category;
    product.brand = brand !== undefined ? brand : product.brand;
    product.sku = sku !== undefined ? sku : product.sku;
    product.barcode = barcode !== undefined ? barcode : product.barcode;
    product.unit = unit || product.unit;
    product.purchasePrice = purchasePrice !== undefined ? purchasePrice : product.purchasePrice;
    product.sellingPrice = sellingPrice !== undefined ? sellingPrice : product.sellingPrice;
    product.mrp = mrp !== undefined ? mrp : product.mrp;
    product.gstPercent = gstPercent !== undefined ? gstPercent : product.gstPercent;
    product.minimumStock = minimumStock !== undefined ? minimumStock : product.minimumStock;
    product.boxCoverage = boxCoverage !== undefined ? boxCoverage : product.boxCoverage;
    if (images !== undefined) product.images = images;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Deactivate (soft-delete) a product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, shop: req.user.shop });

  if (product && product.isActive) {
    product.isActive = false;
    await product.save();
    res.json({ message: 'Product removed (deactivated)' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
