class AppError extends Error {
  constructor(message, status = 400, errors = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errors = errors;
  }
}

module.exports = AppError;
