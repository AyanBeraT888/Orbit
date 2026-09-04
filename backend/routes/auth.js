const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { authLimiter } = require('../middleware/rateLimiter');

// Helper to create or update user
const syncUser = async (uid, decodedToken, provider) => {
  const userRef = db.collection('users').doc(uid);
  const doc = await userRef.get();
  
  const email = decodedToken.email || null;
  const name = decodedToken.name || (email ? email.split('@')[0] : `user_${uid.slice(0, 5)}`);

  if (!doc.exists) {
    const userData = {
      uuid: uuidv4(),
      username: name,
      email,
      access_tier: 'full',
      firebaseUid: uid,
      avatar: decodedToken.picture || null,
      stampCount: 0,
      joinDate: new Date().toISOString(),
      isSuspended: false
    };
    await userRef.set(userData);
    return userData;
  } else {
    const existingData = doc.data();
    if (existingData.access_tier !== 'full') {
      await userRef.update({ access_tier: 'full' });
      return { ...existingData, access_tier: 'full' };
    }
    return existingData;
  }
};

// POST /auth/google
router.post('/google', authLimiter, async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'ID Token required' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const user = await syncUser(uid, decodedToken, 'google');
    res.status(200).json({ message: 'Google login successful', user, tier: 'full' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
});

// POST /auth/facebook
router.post('/facebook', authLimiter, async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'ID Token required' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const user = await syncUser(uid, decodedToken, 'facebook');
    res.status(200).json({ message: 'Facebook login successful', user, tier: 'full' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
});

// POST /auth/phone/upgrade
// For Google-signed-in users who later add a phone number
router.post('/phone/upgrade', authLimiter, async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'ID Token required' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (!decodedToken.phone_number) {
      return res.status(400).json({ error: 'Token does not contain a verified phone number' });
    }

    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = {
      phoneNumber: decodedToken.phone_number,
      phone_verified: true,
      access_tier: 'full'
    };

    await userRef.update(updateData);
    res.status(200).json({ message: 'Account upgraded to Full Access', user: { ...doc.data(), ...updateData } });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /auth/me
router.get('/me', authLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    res.json({ user: userDoc.data() });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;

