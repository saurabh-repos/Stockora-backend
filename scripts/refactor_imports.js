const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

const map = {
  // Common Utils & Middlewares
  "require('../utils/asyncHandler')": "require('../../core/utils/asyncHandler')",
  "require('../../utils/asyncHandler')": "require('../../core/utils/asyncHandler')",
  "require('../middlewares/authMiddleware')": "require('../../core/middlewares/authMiddleware')",
  "require('../../middlewares/authMiddleware')": "require('../../core/middlewares/authMiddleware')",
  "require('../middlewares/validateRequest')": "require('../../core/middlewares/validateRequest')",
  "require('../../middlewares/validateRequest')": "require('../../core/middlewares/validateRequest')",
  
  // Models to Auth
  "require('../models/User')": "require('../auth/User')",
  "require('../../models/User')": "require('../auth/User')",
  
  // Models to Platform
  "require('../models/Shop')": "require('../platform/Shop')",
  "require('../../models/Shop')": "require('../platform/Shop')",
  
  // Models to Catalog
  "require('../models/Product')": "require('../catalog/Product')",
  "require('../../models/Product')": "require('../catalog/Product')",
  
  // Models to Inventory
  "require('../models/Warehouse')": "require('../inventory/Warehouse')",
  "require('../../models/Warehouse')": "require('../inventory/Warehouse')",
  "require('../models/InventoryTransaction')": "require('../inventory/InventoryTransaction')",
  "require('../../models/InventoryTransaction')": "require('../inventory/InventoryTransaction')",
  
  // Models to Sales
  "require('../models/Customer')": "require('../sales/Customer')",
  "require('../../models/Customer')": "require('../sales/Customer')",
  "require('../models/Sale')": "require('../sales/Sale')",
  "require('../../models/Sale')": "require('../sales/Sale')",
  
  // Controllers
  "require('../controllers/authController')": "require('./authController')",
  "require('../controllers/productController')": "require('./productController')",
  "require('../controllers/inventoryController')": "require('./inventoryController')",
  "require('../controllers/warehouseController')": "require('./warehouseController')",
  "require('../controllers/dashboardController')": "require('./dashboardController')",
  "require('../controllers/superAdminController')": "require('./platformController')",
  "require('../controllers/adminController')": "require('./adminController')",
  "require('../controllers/saleController')": "require('./saleController')",
  "require('../controllers/customerController')": "require('./customerController')",
  
  // Validators
  "require('../validators/authValidator')": "require('./authValidator')",
  "require('../validators/productValidator')": "require('./productValidator')",
  "require('../validators/inventoryValidator')": "require('./inventoryValidator')",
};

walk(path.join(__dirname, '../src/modules'), (err, files) => {
  if (err) throw err;
  
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    for (const [oldStr, newStr] of Object.entries(map)) {
      if (content.includes(oldStr)) {
        content = content.replaceAll(oldStr, newStr);
        changed = true;
      }
    }
    
    // Also, inside the same module, model requires become require('./Model')
    // For example, in productController.js, require('../catalog/Product') should be require('./Product')
    const inCatalog = file.includes('\\catalog\\') || file.includes('/catalog/');
    if (inCatalog) {
      if (content.includes("require('../catalog/Product')")) {
        content = content.replaceAll("require('../catalog/Product')", "require('./Product')");
        changed = true;
      }
    }
    
    const inAuth = file.includes('\\auth\\') || file.includes('/auth/');
    if (inAuth) {
      if (content.includes("require('../auth/User')")) {
        content = content.replaceAll("require('../auth/User')", "require('./User')");
        changed = true;
      }
    }
    
    const inPlatform = file.includes('\\platform\\') || file.includes('/platform/');
    if (inPlatform) {
      if (content.includes("require('../platform/Shop')")) {
        content = content.replaceAll("require('../platform/Shop')", "require('./Shop')");
        changed = true;
      }
    }
    
    const inInventory = file.includes('\\inventory\\') || file.includes('/inventory/');
    if (inInventory) {
      if (content.includes("require('../inventory/Warehouse')")) {
        content = content.replaceAll("require('../inventory/Warehouse')", "require('./Warehouse')");
        changed = true;
      }
      if (content.includes("require('../inventory/InventoryTransaction')")) {
        content = content.replaceAll("require('../inventory/InventoryTransaction')", "require('./InventoryTransaction')");
        changed = true;
      }
    }
    
    const inSales = file.includes('\\sales\\') || file.includes('/sales/');
    if (inSales) {
      if (content.includes("require('../sales/Customer')")) {
        content = content.replaceAll("require('../sales/Customer')", "require('./Customer')");
        changed = true;
      }
      if (content.includes("require('../sales/Sale')")) {
        content = content.replaceAll("require('../sales/Sale')", "require('./Sale')");
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log('Updated:', file);
    }
  });
});
