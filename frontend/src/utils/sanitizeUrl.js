/**
 * sanitizeUrl.js
 *
 * Validates image source URLs and data URIs against strict security policies:
 * - Protocol allowlist: http:, https:, or relative paths (/... or ./)
 *   (protocol-relative //... is rejected to prevent unvetted domain redirects)
 * - Raster-only data URIs: image/png, image/jpeg, image/gif, image/webp
 *   (image/svg+xml and all non-image data types are strictly rejected due to script execution risks)
 * - Base64 structural integrity: standard base64 alphabet, proper padding, non-empty
 * - Strict rejection of javascript:, vbscript:, blob:, data:text/html, etc.
 * - Always returns a safe fallback ('') on any failure.
 */

const ALLOWED_RASTER_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
]);

// Base64 pattern: valid base64 character blocks with proper padding length
const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * Validates an image src string. Returns the trimmed valid URL/URI, or '' if invalid or unsafe.
 *
 * @param {unknown} src
 * @returns {string}
 */
export const validateImageSrc = (src) => {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';

  // 1. Check for data: URI
  if (trimmed.startsWith('data:')) {
    // Expected format: data:<mediatype>;base64,<payload>
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) return '';

    const header = trimmed.slice(0, commaIndex);
    const payload = trimmed.slice(commaIndex + 1);

    // Must be base64 encoded
    if (!header.endsWith(';base64')) return '';

    // Extract MIME type: data:<mime>;base64
    const mime = header.slice(5, -7).toLowerCase();

    // Strictly enforce raster images only (rejects image/svg+xml, text/html, etc.)
    if (!ALLOWED_RASTER_MIMES.has(mime)) return '';

    // Validate payload is non-empty and structurally valid base64
    if (!payload || !BASE64_REGEX.test(payload)) return '';

    return trimmed;
  }

  // 2. Reject explicit dangerous schemes before URL parsing
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('file:')
  ) {
    return '';
  }

  // 3. Reject protocol-relative URLs (//example.com) to prevent uncontrolled host jumping
  if (trimmed.startsWith('//')) {
    return '';
  }

  // 4. Relative and root-relative paths (/path/to/img.png or ./img.png)
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
    // Ensure no control characters or embedded spaces/quotes
    if (/[\s\r\n\t<>"']/.test(trimmed)) return '';
    return trimmed;
  }

  // 5. Absolute URLs (http: or https: only)
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return '';
  } catch {
    return '';
  }
};

// Export sanitizeImageSrc as an alias for backward compatibility
export const sanitizeImageSrc = validateImageSrc;

export default validateImageSrc;
