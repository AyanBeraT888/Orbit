import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateImageSrc, sanitizeImageSrc } from './sanitizeUrl.js';

describe('validateImageSrc & sanitizeImageSrc', () => {
  it('exports validateImageSrc and backwards-compatible sanitizeImageSrc alias', () => {
    assert.strictEqual(typeof validateImageSrc, 'function');
    assert.strictEqual(validateImageSrc, sanitizeImageSrc);
  });

  describe('valid HTTP / HTTPS URLs', () => {
    it('accepts valid HTTPS URLs', () => {
      const url = 'https://images.unsplash.com/photo-12345?w=800&q=80';
      assert.strictEqual(validateImageSrc(url), url);
    });

    it('accepts valid HTTP URLs', () => {
      const url = 'http://example.com/avatar.jpg';
      assert.strictEqual(validateImageSrc(url), url);
    });

    it('trims surrounding whitespace on valid URLs', () => {
      assert.strictEqual(
        validateImageSrc('  https://example.com/pic.png  '),
        'https://example.com/pic.png'
      );
    });
  });

  describe('valid relative and root-relative paths', () => {
    it('accepts root-relative paths', () => {
      assert.strictEqual(validateImageSrc('/assets/logo.png'), '/assets/logo.png');
      assert.strictEqual(validateImageSrc('/images/sub/photo.webp'), '/images/sub/photo.webp');
    });

    it('accepts dot-relative paths', () => {
      assert.strictEqual(validateImageSrc('./avatars/user.jpg'), './avatars/user.jpg');
    });

    it('rejects relative paths with spaces, quotes, or angle brackets', () => {
      assert.strictEqual(validateImageSrc('/path/to/image.png" onmouseover="alert(1)'), '');
      assert.strictEqual(validateImageSrc('/path/to/image.png<script>'), '');
      assert.strictEqual(validateImageSrc('/path/with space/image.png'), '');
    });
  });

  describe('valid raster image data: URIs', () => {
    it('accepts valid PNG base64 data URI', () => {
      const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      assert.strictEqual(validateImageSrc(png), png);
    });

    it('accepts valid JPEG base64 data URI', () => {
      const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      assert.strictEqual(validateImageSrc(jpeg), jpeg);
    });

    it('accepts valid WebP base64 data URI', () => {
      const webp = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
      assert.strictEqual(validateImageSrc(webp), webp);
    });

    it('accepts valid GIF base64 data URI', () => {
      const gif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      assert.strictEqual(validateImageSrc(gif), gif);
    });
  });

  describe('strict rejection of dangerous and disallowed schemes', () => {
    it('rejects javascript: pseudo-protocol', () => {
      assert.strictEqual(validateImageSrc('javascript:alert(1)'), '');
      assert.strictEqual(validateImageSrc('JAVASCRIPT:alert(document.cookie)'), '');
      assert.strictEqual(validateImageSrc('javascript://example.com/%0Aalert(1)'), '');
    });

    it('rejects vbscript: pseudo-protocol', () => {
      assert.strictEqual(validateImageSrc('vbscript:msgbox("XSS")'), '');
    });

    it('rejects blob: URLs', () => {
      assert.strictEqual(validateImageSrc('blob:https://example.com/abcd-1234'), '');
    });

    it('rejects file: URLs', () => {
      assert.strictEqual(validateImageSrc('file:///etc/passwd'), '');
      assert.strictEqual(validateImageSrc('file:///C:/Windows/System32/calc.exe'), '');
    });

    it('rejects protocol-relative URLs (//)', () => {
      assert.strictEqual(validateImageSrc('//evil.com/tracker.png'), '');
      assert.strictEqual(validateImageSrc('  //attacker.org/xss.js  '), '');
    });
  });

  describe('strict rejection of unsafe data: URIs', () => {
    it('rejects SVG data URIs (can contain executable script)', () => {
      const svg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD48L3N2Zz4=';
      assert.strictEqual(validateImageSrc(svg), '');
    });

    it('rejects text/html data URIs', () => {
      const html = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
      assert.strictEqual(validateImageSrc(html), '');
    });

    it('rejects non-image data types', () => {
      assert.strictEqual(validateImageSrc('data:text/plain;base64,SGVsbG8='), '');
      assert.strictEqual(validateImageSrc('data:application/javascript;base64,YWxlcnQoMSk='), '');
    });

    it('rejects non-base64 data URIs', () => {
      assert.strictEqual(validateImageSrc('data:image/png;utf8,<svg></svg>'), '');
      assert.strictEqual(validateImageSrc('data:image/png,not-base64'), '');
    });

    it('rejects data URIs with invalid base64 payloads', () => {
      assert.strictEqual(validateImageSrc('data:image/png;base64,invalid!characters@#$'), '');
      assert.strictEqual(validateImageSrc('data:image/png;base64,'), '');
      // Invalid length / padding
      assert.strictEqual(validateImageSrc('data:image/png;base64,abc'), '');
    });
  });

  describe('non-string and empty inputs', () => {
    it('returns empty string for null and undefined', () => {
      assert.strictEqual(validateImageSrc(null), '');
      assert.strictEqual(validateImageSrc(undefined), '');
    });

    it('returns empty string for empty and whitespace-only strings', () => {
      assert.strictEqual(validateImageSrc(''), '');
      assert.strictEqual(validateImageSrc('   '), '');
    });

    it('returns empty string for non-string types', () => {
      assert.strictEqual(validateImageSrc(123), '');
      assert.strictEqual(validateImageSrc({}), '');
      assert.strictEqual(validateImageSrc([]), '');
      assert.strictEqual(validateImageSrc(true), '');
    });
  });
});
