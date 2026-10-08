const path = require('path');
const fs = require('fs');
const { uploadRoot } = require('../middleware/upload');

/**
 * Local disk storage. Swap this module for Cloudinary/S3 without changing callers.
 */
async function saveUploadedFile(file) {
  if (!file) return null;
  // multer disk storage already saved the file
  const filename = file.filename || path.basename(file.path);
  return `/uploads/${filename}`;
}

async function deleteByUrl(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const full = path.join(uploadRoot, path.basename(url));
  if (fs.existsSync(full)) {
    fs.unlinkSync(full);
  }
}

module.exports = {
  saveUploadedFile,
  deleteByUrl,
};
