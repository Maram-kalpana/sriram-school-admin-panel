function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const errors = err.errors || undefined;

  res.status(status).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}

module.exports = errorHandler;
