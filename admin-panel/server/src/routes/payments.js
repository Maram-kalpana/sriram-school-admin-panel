const express = require('express');
const paymentsController = require('../controllers/paymentsController');

const router = express.Router();

router.get('/', paymentsController.listPayments);
router.get('/export', paymentsController.exportPayments);

module.exports = router;
