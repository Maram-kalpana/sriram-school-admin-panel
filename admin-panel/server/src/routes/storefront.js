const express = require('express');
const storefrontApiKey = require('../middleware/storefrontApiKey');
const storefrontController = require('../controllers/storefrontController');

const router = express.Router();

router.use(storefrontApiKey);
router.post('/login', storefrontController.login);
router.get('/catalog', storefrontController.getCatalog);
router.post('/orders', storefrontController.placeOrder);
router.get('/orders', storefrontController.listOrders);

module.exports = router;
