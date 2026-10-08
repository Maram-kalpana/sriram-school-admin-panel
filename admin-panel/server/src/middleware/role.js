const AppError = require('../utils/AppError');

/**
 * Restrict route to one or more admin roles.
 * Usage: role('super_admin') or role('super_admin', 'staff')
 */
function role(...allowed) {
  return function roleMiddleware(req, res, next) {
    if (!req.admin) {
      return next(new AppError('Authentication required', 401));
    }
    if (!allowed.includes(req.admin.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    return next();
  };
}

module.exports = role;
