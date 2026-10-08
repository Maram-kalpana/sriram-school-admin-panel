const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const isAppError = err instanceof AppError || status < 500;

  if (!isAppError || status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message: status >= 500 && !isAppError ? 'Internal server error' : err.message || 'Error',
    ...(err.errors ? { errors: err.errors } : {}),
  });
}

module.exports = errorHandler;
