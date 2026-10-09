const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { memoryUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/', inventoryController.listVariants);
router.get('/summary', inventoryController.summary);
router.get('/export', inventoryController.exportCsv);
router.get('/low-stock-report', inventoryController.lowStockReport);
router.get('/:id/movements', inventoryController.movements);
router.post('/:id/adjust', inventoryController.adjustStock);
router.post('/bulk/preview', memoryUpload.single('file'), inventoryController.bulkPreview);
router.post('/bulk/commit', memoryUpload.single('file'), inventoryController.bulkCommit);

module.exports = router;
