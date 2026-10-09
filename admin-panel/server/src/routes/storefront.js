const express = require('express');
const rateLimit = require('express-rate-limit');
const storefrontApiKey = require('../middleware/storefrontApiKey');
const storefrontController = require('../controllers/storefrontController');
const storefrontPaytm = require('../controllers/storefrontPaytmController');

const router = express.Router();

const callbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/payments/paytm/callback', callbackLimiter, storefrontPaytm.callback);

router.use(storefrontApiKey);
router.post('/login', storefrontController.login);
router.get('/catalog', storefrontController.getCatalog);
router.post('/orders', storefrontController.placeOrder);
router.get('/orders', storefrontController.listOrders);
router.post('/payments/paytm/initiate', storefrontPaytm.initiate);
router.get('/payments/paytm/status/:orderNumber', storefrontPaytm.status);

module.exports = router;
