const asyncHandler = require('../../core/utils/asyncHandler');
const imagekit = require('../../core/utils/imagekit');

// @desc    Upload multiple images to ImageKit
// @route   POST /api/upload/multiple
// @access  Private
const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('No files were uploaded');
  }

  const uploadPromises = req.files.map(file => {
    return new Promise((resolve, reject) => {
      imagekit.upload({
        file: file.buffer, // The memory buffer from multer
        fileName: file.originalname, // Original file name
        folder: '/inventory-management' // Optional: Group images in ImageKit
      }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.url); // Return the ImageKit URL
        }
      });
    });
  });

  try {
    const urls = await Promise.all(uploadPromises);
    res.json({ urls });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to upload images to ImageKit');
  }
});

module.exports = {
  uploadMultipleImages
};
