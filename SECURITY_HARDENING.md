# Orb — Security Hardening

> Covers: input sanitization & validation, security headers (CSP), and frontend XSS protection.

---

## Overview

Three attack surfaces were identified and hardened:

| # | Surface | Risk | Fix |
|---|---|---|---|
| 1 | Backend — user-controlled inputs | Stored XSS, injection, NoSQL abuse | `sanitize.js` validators on every route |
| 2 | Backend — bare `helmet()` call | No Content Security Policy | Explicit CSP directives in `server.js` |
| 3 | Frontend — `innerHTML` template literals | Reflected XSS via server data | `escapeHtml()` wrapper utility |

---

## 1. New Dependency

```bash
npm install validator   # zero transitive deps, ~1 MB
```

Used for email, phone, UUID, and URL validation in `sanitize.js`.

---

## 2. `middleware/sanitize.js` — Central Validation Module

**Path:** [`backend/middleware/sanitize.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/backend/middleware/sanitize.js)

A single utility module that all route files import from. Every exported function returns `{ ok, value }` on success or `{ ok: false, error }` on failure, so routes can do a one-line check and reply `400`.

### Internal primitives

| Helper | What it does |
|---|---|
| `stripControl(str)` | Removes NUL bytes, carriage returns, and control chars (except `\t`/`\n`) |
| `clean(value, maxLen)` | Trim + strip control chars + enforce max length; returns `null` if blank |

### Exported validators

| Export | Rules | Used in |
|---|---|---|
| `validateUsername(v)` | Alphanumeric + `_` `-` only; 3–30 chars | `PATCH /users/username` |
| `validateText(v, opts)` | Strips control chars; configurable `maxLen` and `required` | `POST /stamps/drop` (title, description) |
| `validateGroupName(v)` | Printable chars, no `<>`; 1–50 chars | `POST /groups/create` |
| `validateEmail(v)` | `validator.isEmail()` + lowercase normalisation | `PATCH /users/email` |
| `validatePhone(v)` | `validator.isMobilePhone('any')` | `PATCH /users/phone` |
| `validateUUID(v)` | `validator.isUUID()` (v1–v5) | `POST /friends/request`, `GET /users/:id` |
| `validateFirestoreId(v)` | Alphanumeric + `_` `-`; 1–128 chars | `POST /stamps/:id/react` |
| `validateLatLng(lat, lng)` | Both finite; lat ∈ [−90,90], lng ∈ [−180,180] | All location write/read routes |
| `validateVisibility(v)` | Must be `'public'`, `'friends'`, or `'private'` | `POST /stamps/drop` |
| `validateEmoji(v)` | Single grapheme cluster via `Intl.Segmenter` (fallback regex) | `POST /stamps/:id/react` |
| `validatePhotos(v)` | Array; each item a valid `https://` URL; max 3 items | `POST /stamps/drop` |
| `validateMembersArray(v)` | Array; each item a valid Firebase UID string; max 20 | `POST /groups/create` |
| `sanitizeSearchQuery(v)` | `validator.escape()` + strip control chars; max 50 chars | `GET /users/search?q=` |
| `sanitizeAddress(v)` | `validator.escape()` + max 100 chars | `GET /location/decode?address=` |

---

## 3. Route-by-Route Changes

### `routes/users.js`

| Endpoint | Field | Validator applied |
|---|---|---|
| `GET /:id` | `req.params.id` | `validateUUID` — rejects non-UUID before Firestore query |
| `PATCH /username` | `req.body.newUsername` | `validateUsername` — alphanumeric, 3–30 chars |
| `PATCH /email` | `req.body.newEmail` | `validateEmail` — RFC-compliant, normalised to lowercase |
| `PATCH /phone` | `req.body.newPhone` | `validatePhone` — international mobile formats |
| `GET /search?q=` | `req.query.q` | `sanitizeSearchQuery` — escaped + max 50 chars |

```diff
// PATCH /users/username — before
- const { newUsername } = req.body;
- if (!newUsername) return res.status(400).json({ error: 'New username is required' });

// after
+ const usernameCheck = validateUsername(req.body.newUsername);
+ if (!usernameCheck.ok) return res.status(400).json({ error: usernameCheck.error });
+ const newUsername = usernameCheck.value;
```

---

### `routes/stamps.js`

| Endpoint | Field | Validator applied |
|---|---|---|
| `POST /drop` | `lat`, `lng` | `validateLatLng` — numeric range check |
| `POST /drop` | `title` | `validateText` — max 80 chars, optional |
| `POST /drop` | `description` | `validateText` — max 500 chars, optional |
| `POST /drop` | `visibility` | `validateVisibility` — enum guard |
| `POST /drop` | `photos` | `validatePhotos` — HTTPS URLs, max 3 |
| `POST /:id/react` | `req.params.stampId` | `validateFirestoreId` — alphanumeric doc ID |
| `POST /:id/react` | `req.body.emoji` | `validateEmoji` — single grapheme cluster only |

```diff
// POST /stamps/drop — before
- const geoAddress = await getGeoAddress(lat, lng);
- visibility: visibility || 'public',
- images: Array.isArray(photos) ? photos.slice(0, 3) : [],

// after (validated values only reach Firestore)
+ const coordCheck = validateLatLng(lat, lng);
+ if (!coordCheck.ok) return res.status(400).json({ error: coordCheck.error });
+ const geoAddress = await getGeoAddress(coordCheck.lat, coordCheck.lng);
+ visibility: visCheck.value,
+ images: photosCheck.value,
```

---

### `routes/groups.js`

| Endpoint | Field | Validator applied |
|---|---|---|
| `POST /create` | `req.body.name` | `validateGroupName` — printable, no `<>`, max 50 chars |
| `POST /create` | `req.body.members` | `validateMembersArray` — max 20 Firebase UIDs |

```diff
// before
- if (!name || !members || !Array.isArray(members)) {
-   return res.status(400).json({ error: 'Invalid group data' });
- }

// after
+ const nameCheck = validateGroupName(name);
+ if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error });
+ const membersCheck = validateMembersArray(members);
+ if (!membersCheck.ok) return res.status(400).json({ error: membersCheck.error });
```

---

### `routes/friends.js`

| Endpoint | Field | Validator applied |
|---|---|---|
| `POST /request` | `req.body.targetUserId` | `validateUUID` — blocks malformed IDs before Firestore lookup |

```diff
+ const idCheck = validateUUID(targetUserId);
+ if (!idCheck.ok) return res.status(400).json({ error: `targetUserId: ${idCheck.error}` });
  // Firestore query now uses idCheck.value (not raw user input)
- const targetQuery = await db.collection('users').where('uuid', '==', targetUserId).get();
+ const targetQuery = await db.collection('users').where('uuid', '==', idCheck.value).get();
```

---

### `routes/location.js`

| Endpoint | Field | Validator applied |
|---|---|---|
| `POST /start` | `lat`, `lng` (body) | `validateLatLng` |
| `PATCH /update` | `lat`, `lng` (body) | `validateLatLng` |
| `GET /encode` | `lat`, `lng` (query) | `validateLatLng` — replaces plain `parseFloat` |
| `GET /decode` | `address` (query) | `sanitizeAddress` — stripped + escaped |

```diff
// GET /location/encode — before
- if (!lat || !lng) return res.status(400).json({ error: 'Missing lat or lng query parameters' });
- const geoAddress = await getGeoAddress(parseFloat(lat), parseFloat(lng));

// after
+ const coordCheck = validateLatLng(lat, lng);
+ if (!coordCheck.ok) return res.status(400).json({ error: coordCheck.error });
+ const geoAddress = await getGeoAddress(coordCheck.lat, coordCheck.lng);
```

---

## 4. Security Headers — `server.js`

**Path:** [`backend/server.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/backend/server.js)

Replaced the bare `helmet()` call with an explicit Content Security Policy:

```diff
- app.use(helmet());

+ app.use(helmet({
+   contentSecurityPolicy: {
+     directives: {
+       defaultSrc:              ["'self'"],
+       scriptSrc:               ["'self'"],
+       styleSrc:                ["'self'", "'unsafe-inline'"],
+       imgSrc:                  ["'self'", "data:", "blob:", "https:"],
+       connectSrc:              ["'self'", "wss:", "https:"],
+       fontSrc:                 ["'self'", "https://fonts.gstatic.com"],
+       objectSrc:               ["'none'"],
+       frameSrc:                ["'none'"],
+       baseUri:                 ["'self'"],
+       upgradeInsecureRequests: [],
+     },
+   },
+   crossOriginEmbedderPolicy: false,
+ }));
```

### CSP Directive Rationale

| Directive | Value | Why |
|---|---|---|
| `default-src` | `'self'` | Baseline: only same-origin unless overridden |
| `script-src` | `'self'` | Blocks all inline `<script>` and `eval()` |
| `style-src` | `'self' 'unsafe-inline'` | MapLibre GL injects inline styles at runtime |
| `img-src` | `'self' data: blob: https:` | Tile CDNs serve map images over HTTPS |
| `connect-src` | `'self' wss: https:` | Socket.IO WebSocket + external APIs |
| `object-src` | `'none'` | Blocks Flash and legacy plugin embeds |
| `frame-src` | `'none'` | No iframes — prevents clickjacking |
| `COEP` | `false` | Required for MapLibre cross-origin tile loading |

---

## 5. Frontend XSS Protection

### New utility — `escapeHtml.js`

**Path:** [`frontend/src/utils/escapeHtml.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/frontend/src/utils/escapeHtml.js)

```js
export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
```

> **Note:** This is only for `innerHTML` template literals. React JSX `{value}` interpolation already escapes by default — do **not** use `escapeHtml` in JSX.

---

### `MapComponent.jsx` — friend marker initials

**Path:** [`frontend/src/components/Map/MapComponent.jsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/frontend/src/components/Map/MapComponent.jsx)

The friend avatar marker injects a user-derived username initial into raw HTML. If a username bypass ever occurred at the server, a crafted initial like `"><img src=x onerror=alert(1)>` would execute.

```diff
- el.innerHTML = `...${initials}...`;
+ el.innerHTML = `...${escapeHtml(initials)}...`;
```

---

### `ProfileView.jsx` — city cluster badge

**Path:** [`frontend/src/pages/Dashboard/ProfileView.jsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/frontend/src/pages/Dashboard/ProfileView.jsx)

The city cluster name comes from stamp geo-data returned by the server and is injected directly into an `innerHTML` template.

```diff
- el.innerHTML = `<span class="city-cluster-name">${cityName}</span>...`;
+ el.innerHTML = `<span class="city-cluster-name">${escapeHtml(cityName)}</span>...`;
```

---

## 6. Error Response Format

All validation failures return a consistent `400` JSON body — no stack traces, internal field names, or database details are leaked:

```json
{ "error": "Username may only contain letters, numbers, underscores and hyphens" }
```

---

## 7. HTTP Response Splitting (Defence-in-Depth)

While the audit confirmed **no active vectors** (no `res.redirect`, no `res.cookie`, and `res.set` uses hard-coded strings), three layers of defence-in-depth were added:

1. **Runtime Protection:** Verified Node.js v22 automatically throws `ERR_INVALID_CHAR` if CR (`\r`) or LF (`\n`) are passed to header values.
2. **`sanitize.js` Hardening:** Explicitly documented `stripControl()` to strip CR/LF, and added a `sanitizeHeaderValue()` export for any future route that needs to set custom headers.
3. **Tile Proxy Validation:** `location.js` now uses `validateTileCoord()` to ensure `z`/`x`/`y` params are strictly non-negative integers before being interpolated into upstream tile URLs.

---

## 8. What Was Intentionally Left Out

| Item | Reason |
|---|---|
| `auth.js` inputs (`idToken`) | Firebase SDK validates JWT structure internally |
| `stamps/:stampId` (GET, DELETE) | `stampId` comes from Firestore, not user free-text |
| React JSX render paths | React escapes `{value}` by default |
| DOMPurify (frontend) | Only two `innerHTML` spots needed covering — `escapeHtml` suffices |

---

## 9. Files Changed

| File | Type | Change |
|---|---|---|
| [`backend/middleware/sanitize.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/backend/middleware/sanitize.js) | **NEW** | Central validator/sanitizer module |
| [`frontend/src/utils/escapeHtml.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/frontend/src/utils/escapeHtml.js) | **NEW** | HTML entity escaper for `innerHTML` |
| [`backend/server.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/backend/server.js) | Modified | Explicit CSP via `helmet()` |
| [`backend/routes/users.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/backend/routes/users.js) | Modified | Username, email, phone, UUID, search validation |
| [`backend/routes/stamps.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/backend/routes/stamps.js) | Modified | Coords, text, visibility, emoji, photos validation |
| [`backend/routes/groups.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/backend/routes/groups.js) | Modified | Group name + members array validation |
| [`backend/routes/friends.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/backend/routes/friends.js) | Modified | UUID validation on friend request target |
| [`backend/routes/location.js`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/backend/routes/location.js) | Modified | Lat/lng range checks, address sanitization |
| [`frontend/src/components/Map/MapComponent.jsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/frontend/src/components/Map/MapComponent.jsx) | Modified | `escapeHtml(initials)` in marker template |
| [`frontend/src/pages/Dashboard/ProfileView.jsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Orb/frontend/src/pages/Dashboard/ProfileView.jsx) | Modified | `escapeHtml(cityName)` in cluster badge |
