class AppError extends Error {
  constructor(message, { status = 400, code = 'BAD_REQUEST', details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function fail(message, opts) {
  return new AppError(message, opts);
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const payload = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status === 500 ? 'Something went wrong' : err.message,
    },
  };
  if (err.details) payload.error.details = err.details;
  if (status === 500) console.error(err);
  res.status(status).json(payload);
}

module.exports = { AppError, fail, errorHandler };
