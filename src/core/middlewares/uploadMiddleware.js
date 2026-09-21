const multer = require('multer');

// Configure multer to store files in memory as buffers
// This is required so we can upload them directly to ImageKit
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit per file
  }
});

module.exports = upload;
