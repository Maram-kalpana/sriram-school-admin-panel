// Placeholder — implemented in Step 2
function role(...allowed) {
  return function roleMiddleware(req, res, next) {
    next();
  };
}

module.exports = role;
