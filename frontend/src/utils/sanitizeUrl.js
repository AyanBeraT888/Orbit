/**
 * sanitizeUrl.js
 *
 * Validates and sanitizes image source URLs to prevent DOM-based XSS
 * (such as CodeQL alert 'DOM text reinterpreted as HTML' [js/xss-through-dom]).
 *
 * Ensures image URLs only use safe protocols:
 * - https:// or http://
 * - relative paths (e.g. /favicon.svg)
 * - safe base64 raster image data URIs (png, jpeg, webp, gif)
 *
 * Strictly rejects:
 * - javascript: or vbscript: pseudo-protocols
 * - data:image/svg+xml or data:text/html containing executable scripts
 */

const SAFE_IMAGE_REGEX = /^(?:(?:https?:\/\/|\/)[^\s"'>]+|data:image\/(?:png|jpe?g|webp|gif|bmp);base64,[A-Za-z0-9+/=]+)$/i;

export const sanitizeImageSrc = (src) => {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (SAFE_IMAGE_REGEX.test(trimmed)) {
    return trimmed;
  }
  return '';
};

export default sanitizeImageSrc;
