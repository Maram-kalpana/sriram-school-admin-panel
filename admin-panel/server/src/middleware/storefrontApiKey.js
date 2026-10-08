const env = require('../config/env');
const AppError = require('../utils/AppError');

function storefrontApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== env.storefrontApiKey) {
    return next(new AppError('Invalid storefront API key', 401));
  }
  return next();
}

module.exports = storefrontApiKey;
