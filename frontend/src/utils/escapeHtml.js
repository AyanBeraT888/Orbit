/**
 * escapeHtml.js
 *
 * Minimal HTML-entity escaper for use in vanilla DOM `innerHTML` template
 * literals. Only use this for values that must be injected into raw HTML
 * strings (e.g. MapLibre marker elements). For React JSX, {value} is already
 * safe — do NOT use this in JSX.
 *
 * Usage:
 *   import { escapeHtml } from '../../utils/escapeHtml';
 *   el.innerHTML = `<span>${escapeHtml(userSuppliedName)}</span>`;
 */

/**
 * Escape the five characters that have special meaning in HTML.
 * Converts null/undefined to an empty string safely.
 *
 * @param {*} value - The value to escape. Non-strings are coerced.
 * @returns {string} The HTML-escaped string.
 */
export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
