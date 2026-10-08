const express = require('express');
const productsController = require('../controllers/productsController');
const { diskUpload } = require('../middleware/upload');
const role = require('../middleware/role');

const router = express.Router();

router.get('/', productsController.listProducts);
router.post('/', productsController.createProduct);
router.post('/bulk-status', productsController.bulkStatus);
router.get('/:id', productsController.getProduct);
router.patch('/:id', productsController.updateProduct);
router.post('/:id/duplicate', productsController.duplicateProduct);
router.delete('/:id', role('super_admin'), productsController.deleteProduct);
router.post('/:id/images', diskUpload.array('images', 10), productsController.uploadImages);
router.patch('/:id/images', productsController.reorderImages);
router.delete('/:id/images/:imageId', productsController.deleteImage);

module.exports = router;
