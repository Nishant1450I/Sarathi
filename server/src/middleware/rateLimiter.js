/**
 * In-memory sliding window rate limiter for authentication endpoints.
 * Limits failed attempts per client key (IP + email).
 */

const attemptsMap = new Map();
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_ATTEMPTS = 10;

/**
 * Creates an Express middleware for rate-limiting auth endpoints.
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.maxAttempts]
 * @param {string} [options.prefix]
 */
export function createAuthRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  prefix = 'auth',
} = {}) {
  return function authRateLimiter(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
    const email = (req.body?.email || req.body?.portalHint || '').toLowerCase().trim();
    const key = `${prefix}:${ip}:${email || 'general'}`;
    const now = Date.now();

    const record = attemptsMap.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    if (record.count >= maxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: `Too many attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
        },
        message: 'Too many attempts. Please try again later.',
      });
    }

    // Attach function to record failure
    req.recordAuthFailure = () => {
      record.count += 1;
      attemptsMap.set(key, record);
    };

    // Attach function to reset on success
    req.recordAuthSuccess = () => {
      attemptsMap.delete(key);
    };

    next();
  };
}

// Global cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of attemptsMap.entries()) {
    if (now > value.resetAt) {
      attemptsMap.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

export function clearRateLimit(keyPrefix) {
  if (!keyPrefix) {
    attemptsMap.clear();
    return;
  }
  for (const key of attemptsMap.keys()) {
    if (key.startsWith(keyPrefix)) {
      attemptsMap.delete(key);
    }
  }
}
