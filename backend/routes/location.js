const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/authMiddleware');
const { getGeoAddress, decodeGeoAddress } = require('../utils/geoAddressing');
const {
  locationUpdateLimiter,
  locationReadLimiter,
  geoEncodeLimiter,
  trafficTileLimiter,
  geoAddressingApiLimiter,
} = require('../middleware/rateLimiter');
const { validateLatLng, sanitizeAddress, validateTileCoord } = require('../middleware/sanitize');

// POST /location/start -> mark user as sharing
router.post('/start', authMiddleware, locationUpdateLimiter, async (req, res) => {
  const uid = req.user.uid;
  const { lat, lng } = req.body;

  const coordCheck = validateLatLng(lat, lng);
  if (!coordCheck.ok) return res.status(400).json({ error: coordCheck.error });

  try {
    const geoAddress = await getGeoAddress(coordCheck.lat, coordCheck.lng);

    await db.collection('locations').doc(uid).set({
      uid,
      lat: coordCheck.lat,
      lng: coordCheck.lng,
      geoAddress,
      lastEncodedLat: coordCheck.lat,
      lastEncodedLng: coordCheck.lng,
      isSharing: true,
      mode: 'exact',
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ message: 'Sharing started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start sharing' });
  }
});

// POST /location/stop -> stop sharing, record timestamp
router.post('/stop', authMiddleware, locationUpdateLimiter, async (req, res) => {
  const uid = req.user.uid;

  try {
    await db.collection('locations').doc(uid).set({
      isSharing: false,
      stoppedAt: new Date().toISOString()
    }, { merge: true });

    res.status(200).json({ message: 'Sharing stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop sharing' });
  }
});

// Helper for distance calculation in meters (Haversine formula)
const getDistanceM = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return Infinity;
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// PATCH /location/update -> update lat lng
router.patch('/update', authMiddleware, locationUpdateLimiter, async (req, res) => {
  const uid = req.user.uid;
  const { lat, lng } = req.body;

  const coordCheck = validateLatLng(lat, lng);
  if (!coordCheck.ok) return res.status(400).json({ error: coordCheck.error });
  const { lat: validLat, lng: validLng } = coordCheck;

  try {
    const locDocRef = db.collection('locations').doc(uid);
    const locDoc = await locDocRef.get();

    let geoAddress = null;
    let lastEncodedLat = null;
    let lastEncodedLng = null;
    let shouldRecompute = true;

    if (locDoc.exists) {
      const data = locDoc.data();
      const prevEncodedLat = data.lastEncodedLat;
      const prevEncodedLng = data.lastEncodedLng;
      const prevGeoAddress = data.geoAddress;

      if (prevEncodedLat !== undefined && prevEncodedLng !== undefined && prevGeoAddress) {
        const distance = getDistanceM(prevEncodedLat, prevEncodedLng, validLat, validLng);
        // Only recompute if the user has moved more than 3 meters from the last ENCODED coordinates
        if (distance < 3.0) {
          geoAddress = prevGeoAddress;
          lastEncodedLat = prevEncodedLat;
          lastEncodedLng = prevEncodedLng;
          shouldRecompute = false;
        }
      }
    }

    if (shouldRecompute) {
      geoAddress = await getGeoAddress(validLat, validLng);
      lastEncodedLat = validLat;
      lastEncodedLng = validLng;
    }

    await locDocRef.set({
      lat: validLat,
      lng: validLng,
      geoAddress,
      lastEncodedLat,
      lastEncodedLng,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    res.status(200).json({ message: 'Location updated', geoAddress });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// GET /location/friends -> get current location of all friends
router.get('/friends', authMiddleware, locationReadLimiter, async (req, res) => {
  const uid = req.user.uid;

  try {
    const friendships = await db.collection('friendships')
      .where('users', 'array-contains', uid)
      .get();

    const friendIds = friendships.docs.map(doc => {
      const users = doc.data().users;
      return users.find(id => id !== uid);
    });

    if (friendIds.length === 0) return res.status(200).json([]);

    const locations = [];
    for (const friendId of friendIds) {
      const locDoc = await db.collection('locations').doc(friendId).get();
      if (locDoc.exists) {
        const data = locDoc.data();

        // Visibility rules handled by cleanup job, 
        // but we can add an extra check here just in case.
        locations.push({
          uid: friendId,
          lat: data.lat,
          lng: data.lng,
          geoAddress: data.geoAddress || null,
          isSharing: data.isSharing,
          mode: data.mode,
          updatedAt: data.updatedAt
        });
      }
    }

    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch friends locations' });
  }
});

// GET /location/encode -> get geo address for a specific coordinate
router.get('/encode', geoEncodeLimiter, async (req, res) => {
  const { lat, lng } = req.query;

  const coordCheck = validateLatLng(lat, lng);
  if (!coordCheck.ok) return res.status(400).json({ error: coordCheck.error });

  try {
    const geoAddress = await getGeoAddress(coordCheck.lat, coordCheck.lng);
    let center_lat = coordCheck.lat;
    let center_lng = coordCheck.lng;

    // Decode the address to get the exact center of the grid box
    if (geoAddress) {
      const decoded = await decodeGeoAddress(geoAddress);
      if (decoded && decoded.lat && decoded.lon) {
        center_lat = decoded.lat;
        center_lng = decoded.lon;
      }
    }

    res.status(200).json({ address: geoAddress, center_lat, center_lng });
  } catch (error) {
    console.error('Failed to encode location:', error);
    res.status(500).json({ error: 'Failed to encode location' });
  }
});

// GET /location/decode -> decode a geo address to coordinates
router.get('/decode', geoEncodeLimiter, async (req, res) => {
  const addrCheck = sanitizeAddress(req.query.address);
  if (!addrCheck.ok) return res.status(400).json({ error: addrCheck.error });

  try {
    const decoded = await decodeGeoAddress(addrCheck.value);
    if (!decoded || decoded.lat === undefined || decoded.lon === undefined) {
      return res.status(404).json({ error: 'Failed to decode address. Address may be invalid or out of bounds.' });
    }
    res.status(200).json({
      lat: decoded.lat,
      lng: decoded.lon,
      state_code: decoded.state_code
    });
  } catch (error) {
    console.error('Failed to decode location:', error);
    res.status(500).json({ error: 'Failed to decode location' });
  }
});

// GET /location/grid -> proxy endpoint to fetch 3m grid lines for currently visible bounds
router.get('/grid', authMiddleware, geoAddressingApiLimiter, async (req, res) => {
  const { min_lat, min_lon, max_lat, max_lon } = req.query;

  if (!min_lat || !min_lon || !max_lat || !max_lon) {
    return res.status(400).json({ error: 'Missing bounding box query parameters: min_lat, min_lon, max_lat, max_lon' });
  }

  // Bounding box size validation (2km in degrees is approx 0.02)
  const deltaLat = Math.abs(parseFloat(max_lat) - parseFloat(min_lat));
  const deltaLon = Math.abs(parseFloat(max_lon) - parseFloat(min_lon));
  if (deltaLat > 0.02 || deltaLon > 0.02) {
    return res.status(400).json({ error: 'Bounding box too large. Max allowed width/height is ~2km.' });
  }

  const serviceUrl = process.env.GEO_ADDRESSING_SERVICE_URL || 'http://127.0.0.1:8000';
  const apiKey = process.env.GEO_ADDRESSING_API_KEY || '';

  try {
    const url = `${serviceUrl}/grid?min_lat=${min_lat}&min_lon=${min_lon}&max_lat=${max_lat}&max_lon=${max_lon}`;
    const headers = {};
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    let retries = 3;
    let response;
    while (retries > 0) {
      try {
        response = await fetch(url, { headers });
        break;
      } catch (err) {
        retries -= 1;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Geo-addressing service error: ${errText}` });
    }

    const geojsonData = await response.json();
    res.status(200).json(geojsonData);
  } catch (error) {
    console.error('Failed to proxy grid request:', error);
    res.status(500).json({ error: 'Failed to fetch grid overlay' });
  }
});

// GET /location/traffic/tiles/:z/:x/:y -> Proxy TomTom Live Traffic tiles without exposing API key
router.get('/traffic/tiles/:z/:x/:y', trafficTileLimiter, async (req, res) => {
  const { z, x, y } = req.params;

  const zCheck = validateTileCoord(z, 'z');
  const xCheck = validateTileCoord(x, 'x');
  const yCheck = validateTileCoord(y, 'y');
  if (!zCheck.ok) return res.status(400).json({ error: zCheck.error });
  if (!xCheck.ok) return res.status(400).json({ error: xCheck.error });
  if (!yCheck.ok) return res.status(400).json({ error: yCheck.error });

  const tomTomKey = process.env.TOMTOM_API_KEY;

  if (!tomTomKey || tomTomKey === 'YOUR_TOMTOM_API_KEY') {
    return res.status(503).json({ error: 'TomTom traffic API key not configured' });
  }

  const trafficTileUrl = `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${zCheck.value}/${xCheck.value}/${yCheck.value}.png?key=${tomTomKey}&tileSize=256`;

  try {
    const tileRes = await fetch(trafficTileUrl);
    if (!tileRes.ok) {
      return res.status(tileRes.status).send('Traffic tile fetch failed');
    }
    const buffer = await tileRes.arrayBuffer();
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=60' // Cache for 60s for live traffic updates
    });
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Failed to proxy TomTom traffic tile:', err);
    return res.status(502).json({ error: 'Failed to fetch traffic tile' });
  }
});

// GET /location/transit/tiles/:z/:x/:y -> Proxy Public Transit & Railway tiles with multi-mirror failover
router.get('/transit/tiles/:z/:x/:y', trafficTileLimiter, async (req, res) => {
  const { z, x, y } = req.params;

  const zCheck = validateTileCoord(z, 'z');
  const xCheck = validateTileCoord(x, 'x');
  const yCheck = validateTileCoord(y, 'y');
  if (!zCheck.ok) return res.status(400).json({ error: zCheck.error });
  if (!xCheck.ok) return res.status(400).json({ error: xCheck.error });
  if (!yCheck.ok) return res.status(400).json({ error: yCheck.error });

  const mirrors = [
    `https://tile.memomaps.de/tilegen/${zCheck.value}/${xCheck.value}/${yCheck.value}.png`,
    `https://a.tiles.openrailwaymap.org/standard/${zCheck.value}/${xCheck.value}/${yCheck.value}.png`,
    `https://b.tiles.openrailwaymap.org/standard/${zCheck.value}/${xCheck.value}/${yCheck.value}.png`
  ];

  for (const url of mirrors) {
    try {
      const tileRes = await fetch(url);
      if (tileRes.ok) {
        const buffer = await tileRes.arrayBuffer();
        res.set({
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400' // Cache for 24h
        });
        return res.send(Buffer.from(buffer));
      }
    } catch (err) {
      console.warn(`Transit tile mirror failed (${url}):`, err.message);
    }
  }

  return res.status(502).json({ error: 'Failed to fetch transit tile' });
});

module.exports = router;
