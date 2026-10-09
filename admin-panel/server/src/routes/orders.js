const express = require('express');
const ordersController = require('../controllers/ordersController');
const paymentsController = require('../controllers/paymentsController');

const router = express.Router();

router.get('/', ordersController.listOrders);
router.get('/counts', ordersController.counts);
router.get('/export', ordersController.exportOrders);
router.post('/bulk-status', ordersController.bulkStatus);
router.post('/pick-list', ordersController.pickList);
router.get('/:id', ordersController.getOrder);
router.patch('/:id/status', ordersController.updateStatus);
router.patch('/:id/payment', ordersController.updatePayment);
router.patch('/:id/shipping', ordersController.updateShipping);
router.post('/:id/paytm/status', paymentsController.recheckStatus);
router.post('/:id/paytm/refund', paymentsController.refundOrder);

module.exports = router;
