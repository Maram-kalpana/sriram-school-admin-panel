// Placeholder — implemented in Step 2
function validate(schema, source = 'body') {
  return function validateMiddleware(req, res, next) {
    next();
  };
}

module.exports = validate;
