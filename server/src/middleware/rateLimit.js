function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const rec = hits.get(ip);
    if (!rec || rec.reset < now) {
      hits.set(ip, { count: 1, reset: now + windowMs });
      return next();
    }
    rec.count += 1;
    if (rec.count > max) {
      return res.status(429).json({
        error: { code: 'RATE_LIMITED', message: message || 'Too many attempts. Try again later.' },
      });
    }
    next();
  };
}

module.exports = { createRateLimiter };
