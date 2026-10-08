const express = require('express');
const ordersController = require('../controllers/ordersController');

const router = express.Router();

router.get('/', ordersController.listOrders);
router.get('/export', ordersController.exportOrders);
router.post('/bulk-status', ordersController.bulkStatus);
router.post('/pick-list', ordersController.pickList);
router.get('/:id', ordersController.getOrder);
router.patch('/:id/status', ordersController.updateStatus);
router.patch('/:id/payment', ordersController.updatePayment);

module.exports = router;
