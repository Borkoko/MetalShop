const fs = require('fs');
const path = require('path');

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to ensure
 * @returns {boolean} - Whether the directory exists or was successfully created
 */
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Successfully created directory: ${dirPath}`);
      return true;
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}:`, error);
      return false;
    }
  }
  console.log(`Directory exists: ${dirPath}`);
  return true;
};

/**
 * Creates a unique path for a user's uploaded images
 * @param {string} baseDir - Base directory for uploads
 * @param {string} userId - User ID
 * @returns {string} - Path for the user's uploads
 */
const createUserUploadPath = (baseDir, userId) => {
  const timestamp = Date.now();
  const uploadPath = path.join(baseDir, `${userId}_${timestamp}`);
  ensureDirectoryExists(uploadPath);
  return uploadPath;
};

/**
 * Formats file path for web URL use
 * @param {string} uploadDir - Base upload directory
 * @param {string} filePath - File path 
 * @returns {string} - Web URL path 
 */
const formatImagePath = (uploadDir, filePath) => {
  // Get relative path from upload directory
  const relativePath = path.relative(uploadDir, filePath);
  // Format with forward slashes for web URLs
  return '/images/' + relativePath.replace(/\\/g, '/');
};

/**
 * Validates if a file is a valid image
 * @param {Object} file - Multer file object
 * @returns {boolean} - Whether file is valid
 */
const isValidImage = (file) => {
  // Check if file exists
  if (!file) return false;
  
  // Check mime type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.mimetype)) return false;
  
  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) return false;
  
  return true;
};

/**
 * Checks if an image exists at the given path
 * @param {string} imagePath - Path to check
 * @returns {boolean} - Whether image exists
 */
const imageExists = (imagePath) => {
  if (!imagePath) return false;
  
  // Remove leading slash if present
  if (imagePath.startsWith('/')) {
    imagePath = imagePath.substring(1);
  }
  
  try {
    return fs.existsSync(path.resolve(imagePath));
  } catch (err) {
    console.error("Error checking if image exists:", err);
    return false;
  }
};

// Export utility functions
module.exports = {
  ensureDirectoryExists,
  createUserUploadPath,
  formatImagePath,
  isValidImage,
  imageExists
};
