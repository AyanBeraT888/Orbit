/**
 * rateLimiter.js
 *
 * Provides pre-built express-rate-limit instances for every route group.
 * Three keying strategies are supported:
 *
 *  'ip'     – req.ip (default; used for unauthenticated / public endpoints)
 *  'user'   – req.user.uid set by authMiddleware (falls back to IP if absent)
 *  'apikey' – X-API-Key request header (falls back to IP if absent)
 *
 * Rate-limit response headers follow RFC draft-7 (`RateLimit-*`).
 */

const rateLimit = require('express-rate-limit');

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * createLimiter(options) → express-rate-limit middleware
 *
 * @param {Object} opts
 * @param {'ip'|'user'|'apikey'} opts.strategy  – key source
 * @param {number}  opts.windowMs  – window size in milliseconds
 * @param {number}  opts.max       – max requests allowed per window per key
 * @param {string}  opts.message   – human-readable error string
 */
const createLimiter = ({ strategy = 'ip', windowMs, max, message }) => {
  /** Build the key that uniquely identifies the requester. */
  const keyGenerator = (req) => {
    switch (strategy) {
      case 'user':
        // req.user is populated by authMiddleware before this limiter runs
        return req.user?.uid || req.ip;

      case 'apikey': {
        const apiKey = req.headers['x-api-key'];
        return apiKey || req.ip;
      }

      case 'ip':
      default:
        return req.ip;
    }
  };

  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    message: { error: message },
    standardHeaders: 'draft-7', // RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset
    legacyHeaders: false,       // Disable X-RateLimit-* headers
    // Skip rate limiting entirely in test environments so unit tests are unaffected
    skip: () => process.env.NODE_ENV === 'test',
  });
};

// ---------------------------------------------------------------------------
// Auth endpoints  (keyed by IP – requests arrive before any auth check)
// ---------------------------------------------------------------------------

/** Login / social-auth endpoints: 10 attempts per 15 minutes per IP */
const authLimiter = createLimiter({
  strategy: 'ip',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

// ---------------------------------------------------------------------------
// Location endpoints  (keyed by authenticated user ID)
// ---------------------------------------------------------------------------

/** High-frequency write: location start / stop / update – 60 req/min per user */
const locationUpdateLimiter = createLimiter({
  strategy: 'user',
  windowMs: 60 * 1000,
  max: 60,
  message: 'Location update rate limit exceeded (60 per minute). Slow down.',
});

/** Location reads (friends list, group locations) – 30 req/min per user */
const locationReadLimiter = createLimiter({
  strategy: 'user',
  windowMs: 60 * 1000,
  max: 30,
  message: 'Location read rate limit exceeded (30 per minute). Please wait.',
});

/** Public geo-encode / decode endpoints – 100 req/hour per IP */
const geoEncodeLimiter = createLimiter({
  strategy: 'ip',
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: 'Geo-encode/decode rate limit exceeded (100 per hour). Try again later.',
});

/** Map tile proxies (traffic, transit) – 120 req/min per IP */
const trafficTileLimiter = createLimiter({
  strategy: 'ip',
  windowMs: 60 * 1000,
  max: 120,
  message: 'Tile request rate limit exceeded (120 per minute). Slow down.',
});

/**
 * Internal geo-addressing /grid proxy – 60 req/min keyed by API key.
 * Callers that supply X-API-Key get their own independent quota bucket.
 */
const geoAddressingApiLimiter = createLimiter({
  strategy: 'apikey',
  windowMs: 60 * 1000,
  max: 60,
  message: 'Geo-addressing API rate limit exceeded (60 per minute).',
});

// ---------------------------------------------------------------------------
// Social / friend endpoints  (keyed by user ID)
// ---------------------------------------------------------------------------

/** Friend requests: 10 per 24 hours per user (abuse prevention) */
const friendRequestLimiter = createLimiter({
  strategy: 'user',
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: 'Friend request limit reached (10 per day). Try again tomorrow.',
});

// ---------------------------------------------------------------------------
// Search endpoint  (keyed by user ID)
// ---------------------------------------------------------------------------

/** User / location search: 20 per hour per user */
const searchLimiter = createLimiter({
  strategy: 'user',
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Search rate limit exceeded (20 per hour). Please wait.',
});

// ---------------------------------------------------------------------------
// Stamp endpoints  (keyed by user ID)
// ---------------------------------------------------------------------------

/** Stamp creation / reactions: 50 per 24 hours per user */
const stampLimiter = createLimiter({
  strategy: 'user',
  windowMs: 24 * 60 * 60 * 1000,
  max: 50,
  message: 'Stamp action limit reached (50 per day). Try again tomorrow.',
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  authLimiter,
  locationUpdateLimiter,
  locationReadLimiter,
  geoEncodeLimiter,
  trafficTileLimiter,
  geoAddressingApiLimiter,
  friendRequestLimiter,
  searchLimiter,
  stampLimiter,
};
