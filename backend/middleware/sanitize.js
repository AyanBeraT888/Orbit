/**
 * sanitize.js
 *
 * Reusable input validation and sanitisation helpers for every Orb backend route.
 * Depends only on the `validator` npm package (zero transitive deps).
 *
 * Naming convention:
 *   sanitize*(value)   → returns cleaned value (string) or throws
 *   validate*(value)   → returns { ok, error } — caller decides what to do
 *
 * All exported helpers return { ok: false, error: '<message>' } on bad input
 * so routes can do a single destructured check and reply 400.
 */

const validator = require('validator');

// ---------------------------------------------------------------------------
// Internal primitives
// ---------------------------------------------------------------------------

/**
 * Strip control characters from a string.
 * Explicitly targets:
 *   \x0D (CR, %0d) and \x0A (LF, %0a) — the two bytes used in HTTP Response Splitting.
 *   \x00 (NUL) and all other C0/DEL control chars.
 * Tabs (\x09) and newlines inside body text (\x0A at field level) are preserved
 * only within `clean()` for free-text fields; header values strip everything.
 *
 * Note: Node.js v10+ throws ERR_INVALID_CHAR if CR/LF reach res.setHeader().
 * This function is a defence-in-depth layer applied before that point.
 */
const stripControl = (str) =>
  // \x00-\x08 : NUL, SOH…BS
  // \x0A      : LF  (line feed  — %0a — response splitting vector)
  // \x0B      : VT
  // \x0C      : FF
  // \x0D      : CR  (carriage return — %0d — response splitting vector)
  // \x0E-\x1F : SO…US (remaining C0 control chars)
  // \x7F      : DEL
  str.replace(/[\x00-\x08\x0A-\x0D\x0E-\x1F\x7F]/g, '');

/** Trim + strip control chars + enforce max length. Returns null if blank. */
const clean = (value, maxLen = 500) => {
  if (value === undefined || value === null) return null;
  const s = stripControl(String(value)).trim();
  return s.length === 0 ? null : s.slice(0, maxLen);
};

// ---------------------------------------------------------------------------
// String text fields
// ---------------------------------------------------------------------------

/**
 * Validate a display username.
 * Rules: alphanumeric, underscore, hyphen; 3–30 chars.
 */
const validateUsername = (value) => {
  const s = clean(value, 30);
  if (!s) return { ok: false, error: 'Username is required' };
  if (s.length < 3) return { ok: false, error: 'Username must be at least 3 characters' };
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) {
    return { ok: false, error: 'Username may only contain letters, numbers, underscores and hyphens' };
  }
  return { ok: true, value: s };
};

/**
 * Validate and sanitise a general free-text field (stamp title, description, etc.).
 * Strips control chars and enforces max length; allows unicode letters/emoji.
 */
const validateText = (value, { fieldName = 'Field', maxLen = 500, required = true } = {}) => {
  const s = clean(value, maxLen);
  if (!s) {
    return required
      ? { ok: false, error: `${fieldName} is required` }
      : { ok: true, value: '' };
  }
  return { ok: true, value: s };
};

/**
 * Validate a group name.
 * Rules: printable chars only, 1–50 chars.
 */
const validateGroupName = (value) => {
  const s = clean(value, 50);
  if (!s) return { ok: false, error: 'Group name is required' };
  // Reject if it contains HTML angle brackets (potential injection)
  if (/[<>]/.test(s)) return { ok: false, error: 'Group name contains invalid characters' };
  return { ok: true, value: s };
};

// ---------------------------------------------------------------------------
// Contact / identity fields
// ---------------------------------------------------------------------------

/** Validate an email address using validator.js. */
const validateEmail = (value) => {
  const s = clean(value, 320); // RFC max email length
  if (!s) return { ok: false, error: 'Email is required' };
  if (!validator.isEmail(s)) return { ok: false, error: 'Invalid email address' };
  return { ok: true, value: s.toLowerCase() };
};

/**
 * Validate a phone number (E.164 or common national formats).
 * Uses validator.isMobilePhone with 'any' locale.
 */
const validatePhone = (value) => {
  const s = clean(value, 20);
  if (!s) return { ok: false, error: 'Phone number is required' };
  if (!validator.isMobilePhone(s, 'any', { strictMode: false })) {
    return { ok: false, error: 'Invalid phone number' };
  }
  return { ok: true, value: s };
};

/**
 * Validate that a value looks like a UUID (v1–v5).
 * Used for targetUserId, uuid-based IDs etc.
 */
const validateUUID = (value) => {
  const s = clean(value, 36);
  if (!s) return { ok: false, error: 'ID is required' };
  if (!validator.isUUID(s)) return { ok: false, error: 'Invalid ID format' };
  return { ok: true, value: s };
};

/**
 * Validate a Firestore document ID.
 * Firestore auto-IDs are 20 chars, alphanumeric. We allow 1–128 chars.
 */
const validateFirestoreId = (value) => {
  const s = clean(value, 128);
  if (!s) return { ok: false, error: 'Document ID is required' };
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return { ok: false, error: 'Invalid document ID' };
  return { ok: true, value: s };
};

// ---------------------------------------------------------------------------
// Geospatial
// ---------------------------------------------------------------------------

/**
 * Validate latitude and longitude.
 * Both must be finite numbers; lat ∈ [-90, 90]; lng ∈ [-180, 180].
 */
const validateLatLng = (lat, lng) => {
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  if (!isFinite(latN) || !isFinite(lngN)) {
    return { ok: false, error: 'lat and lng must be valid numbers' };
  }
  if (latN < -90 || latN > 90) return { ok: false, error: 'lat must be between -90 and 90' };
  if (lngN < -180 || lngN > 180) return { ok: false, error: 'lng must be between -180 and 180' };
  return { ok: true, lat: latN, lng: lngN };
};

// ---------------------------------------------------------------------------
// Enum / constrained fields
// ---------------------------------------------------------------------------

/** Validate stamp visibility against the allowed set. */
const validateVisibility = (value) => {
  const ALLOWED = new Set(['public', 'friends', 'private']);
  const s = clean(value, 10);
  if (!s || !ALLOWED.has(s)) {
    return { ok: false, error: "visibility must be 'public', 'friends' or 'private'" };
  }
  return { ok: true, value: s };
};

/**
 * Validate that the emoji field contains exactly one grapheme cluster
 * composed of recognised Unicode emoji code points.
 * Rejects plain ASCII and multi-word strings.
 */
const validateEmoji = (value) => {
  const s = clean(value, 10);
  if (!s) return { ok: false, error: 'Emoji is required' };

  // Use Intl.Segmenter if available (Node 16+), otherwise fall back to regex
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const segments = [...segmenter.segment(s)];
    if (segments.length !== 1) return { ok: false, error: 'Exactly one emoji is required' };
  } else {
    // Fallback: basic emoji Unicode range check
    const emojiRe = /^\p{Emoji_Presentation}|\p{Extended_Pictographic}$/u;
    if (!emojiRe.test(s)) return { ok: false, error: 'Value must be a single emoji' };
  }

  return { ok: true, value: s };
};

/**
 * Validate a photos array.
 * Each element must be a valid HTTPS URL. Max 3 items.
 */
const validatePhotos = (value) => {
  if (!value) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: 'photos must be an array' };
  if (value.length > 3) return { ok: false, error: 'Maximum 3 photos allowed' };

  for (const url of value) {
    const s = String(url);
    if (!s || typeof s !== 'string') {
      return { ok: false, error: 'Invalid photo URL format' };
    }
    
    const lowerS = s.toLowerCase();

    // Allow both HTTPS and data URIs (for base64 uploads)
    if (s.startsWith('data:')) {
      // Must be a supported image data URI (JPEG or PNG)
      if (!lowerS.startsWith('data:image/jpeg') && !lowerS.startsWith('data:image/png')) {
        return { ok: false, error: 'Only JPG, JPEG, and PNG image formats are supported' };
      }
      // Note: Data URIs can be very long, so we don't enforce maxLen = 2048 here, 
      // but rely on Express body parser limit (e.g. 10mb)
    } else {
      const cleaned = clean(s, 2048);
      if (!cleaned || !validator.isURL(cleaned, { protocols: ['https'], require_protocol: true })) {
        return { ok: false, error: `Invalid photo URL: ${s.slice(0, 60)}` };
      }
      
      const parsedUrl = new URL(cleaned);
      const pathname = decodeURIComponent(parsedUrl.pathname).toLowerCase();
      
      // Must be a supported image extension
      if (!pathname.endsWith('.jpg') && !pathname.endsWith('.jpeg') && !pathname.endsWith('.png')) {
        return { ok: false, error: 'Only JPG, JPEG, and PNG image formats are supported' };
      }
    }
  }
  return { ok: true, value: value.map(u => String(u)) };
};

/**
 * Validate a group members array.
 * Each entry must be a non-empty string (Firebase UID). Max 20 members.
 */
const validateMembersArray = (value) => {
  if (!Array.isArray(value)) return { ok: false, error: 'members must be an array' };
  if (value.length === 0) return { ok: false, error: 'At least one member is required' };
  if (value.length > 20) return { ok: false, error: 'A group can have at most 20 members' };

  for (const uid of value) {
    const s = clean(uid, 128);
    if (!s || !/^[a-zA-Z0-9_-]+$/.test(s)) {
      return { ok: false, error: `Invalid member ID: ${String(uid).slice(0, 30)}` };
    }
  }
  return { ok: true, value: value.map((u) => clean(u, 128)) };
};

/**
 * Sanitise a value intended for use in an HTTP response header.
 *
 * Defence-in-depth against HTTP Response Splitting:
 *   1. Strips every CR (\r / %0d) and LF (\n / %0a) character.
 *   2. Strips all other ASCII control chars.
 *   3. Enforces a safe max length (default 256).
 *
 * Node.js v10+ already throws ERR_INVALID_CHAR for raw CR/LF in headers;
 * this function ensures user input is clean before it ever reaches setHeader().
 *
 * Usage:
 *   const safe = sanitizeHeaderValue(req.query.someParam);
 *   if (!safe.ok) return res.status(400).json({ error: safe.error });
 *   res.setHeader('X-Custom-Value', safe.value);
 */
const sanitizeHeaderValue = (value, { maxLen = 256 } = {}) => {
  if (value === undefined || value === null) {
    return { ok: false, error: 'Header value is required' };
  }
  // Strip ALL control chars including CR and LF
  const stripped = String(value)
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLen);

  if (stripped.length === 0) {
    return { ok: false, error: 'Header value must not be empty after sanitisation' };
  }
  return { ok: true, value: stripped };
};

// ---------------------------------------------------------------------------
// Tile coordinate
// ---------------------------------------------------------------------------

/**
 * Validate a map tile coordinate (z, x, or y) from URL params.
 * Each must be a non-negative integer within map tile bounds.
 *
 * @param {string} v   - Raw string from req.params (Express always gives strings)
 * @param {string} role - 'z', 'x', or 'y' — used in the error message
 * @param {number} [maxZ=22] - Maximum zoom level (OSM cap = 19; TomTom = 22)
 */
const validateTileCoord = (v, role, maxZ = 22) => {
  // Must be a string of digits only — no decimal, no sign, no path-traversal
  if (!/^\d+$/.test(String(v))) {
    return { ok: false, error: `Tile param '${role}' must be a non-negative integer` };
  }
  const n = parseInt(v, 10);
  if (role === 'z' && n > maxZ) {
    return { ok: false, error: `Zoom level must be 0–${maxZ}` };
  }
  // x and y max value is 2^z - 1; we enforce a safe upper bound of 2^22
  if (n > 4194303) {
    return { ok: false, error: `Tile param '${role}' is out of range` };
  }
  return { ok: true, value: n };
};

// ---------------------------------------------------------------------------
// Query param helpers
// ---------------------------------------------------------------------------

/**
 * Sanitise a freeform search query (GET ?q=).
 * Strips HTML special chars and control sequences; max 50 chars.
 */
const sanitizeSearchQuery = (value) => {
  const s = clean(value, 50);
  if (!s) return { ok: false, error: 'Search query is required' };
  // Escape HTML entities so the raw value is safe to log / store
  const escaped = validator.escape(s);
  return { ok: true, value: escaped };
};

/**
 * Sanitise an address string (geo-decode query param).
 * Max 100 chars; strip HTML.
 */
const sanitizeAddress = (value) => {
  const s = clean(value, 100);
  if (!s) return { ok: false, error: 'Address is required' };
  return { ok: true, value: validator.escape(s) };
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  validateUsername,
  validateText,
  validateGroupName,
  validateEmail,
  validatePhone,
  validateUUID,
  validateFirestoreId,
  validateLatLng,
  validateVisibility,
  validateEmoji,
  validatePhotos,
  validateMembersArray,
  sanitizeSearchQuery,
  sanitizeAddress,
  // Response-splitting defence-in-depth
  sanitizeHeaderValue,
  validateTileCoord,
};
