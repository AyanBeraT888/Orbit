const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const authMiddleware = require('../middleware/authMiddleware');
const { getGeoAddress } = require('../utils/geoAddressing');
const { stampLimiter } = require('../middleware/rateLimiter');
const {
  validateLatLng,
  validateText,
  validateVisibility,
  validatePhotos,
  validateEmoji,
  validateFirestoreId,
} = require('../middleware/sanitize');

// POST /stamps/drop -> drop a stamp
router.post('/drop', authMiddleware, stampLimiter, async (req, res) => {
  const { lat, lng, title, description, visibility, photos } = req.body;
  const uid = req.user.uid;

  // Validate coordinates
  const coordCheck = validateLatLng(lat, lng);
  if (!coordCheck.ok) return res.status(400).json({ error: coordCheck.error });

  // Sanitise free-text fields
  const titleCheck = validateText(title, { fieldName: 'title', maxLen: 80, required: false });
  if (!titleCheck.ok) return res.status(400).json({ error: titleCheck.error });

  const descCheck = validateText(description, { fieldName: 'description', maxLen: 500, required: false });
  if (!descCheck.ok) return res.status(400).json({ error: descCheck.error });

  // Validate visibility enum (default to 'public' if omitted)
  const visCheck = visibility
    ? validateVisibility(visibility)
    : { ok: true, value: 'public' };
  if (!visCheck.ok) return res.status(400).json({ error: visCheck.error });

  // Validate photos array
  const photosCheck = validatePhotos(photos);
  if (!photosCheck.ok) return res.status(400).json({ error: photosCheck.error });

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    const geoAddress = await getGeoAddress(coordCheck.lat, coordCheck.lng);

    const stampData = {
      userId: uid,
      creatorName: userData.username || 'Anonymous',
      lat: coordCheck.lat,
      lng: coordCheck.lng,
      geoAddress,
      timestamp: new Date().toISOString(),
      avatar: userData.avatar,
      title: titleCheck.value || geoAddress || 'Custom Location',
      description: descCheck.value,
      visibility: visCheck.value,
      images: photosCheck.value,
      reactions: {}
    };

    const stampRef = await db.collection('stamps').add(stampData);

    // Increment stamp count and award 100 points for user
    await db.collection('users').doc(uid).update({
      stampCount: admin.firestore.FieldValue.increment(1),
      points: admin.firestore.FieldValue.increment(100)
    });

    res.status(201).json({ message: 'Stamp dropped', stampId: stampRef.id });
  } catch (error) {
    console.error('Failed to drop stamp:', error);
    res.status(500).json({ error: 'Failed to drop stamp' });
  }
});

// GET /stamps/feed -> get visible stamps based on privacy settings
router.get('/feed', authMiddleware, async (req, res) => {
  const uid = req.user.uid;

  try {
    // 1. Get user's mutual friend IDs
    const friendships = await db.collection('friendships')
      .where('users', 'array-contains', uid)
      .get();

    const friendIds = friendships.docs.map(doc => {
      const users = doc.data().users;
      return users.find(id => id !== uid);
    });

    // 2. Fetch recent stamps from Firestore
    const stampsQuery = await db.collection('stamps')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const stamps = stampsQuery.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(stamp => {
        if (stamp.userId === uid) return true;
        if (stamp.visibility === 'public') return true;
        if (stamp.visibility === 'friends' && friendIds.includes(stamp.userId)) return true;
        return false;
      });

    res.status(200).json(stamps);
  } catch (error) {
    console.error('Error fetching stamps feed:', error);
    res.status(500).json({ error: 'Failed to fetch stamps feed' });
  }
});

// GET /stamps/leaderboard -> get competitive rank leaderboard of all users
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const usersQuery = await db.collection('users').get();
    const leaderboard = usersQuery.docs.map(doc => {
      const data = doc.data();
      const rawPoints = data.points || 0;
      
      let badge = 'Explorer 🧭';
      if (rawPoints >= 1500) {
        badge = 'Master Cartographer 🗺️';
      } else if (rawPoints >= 500) {
        badge = 'Trailblazer 🧗';
      }

      return {
        uid: doc.id,
        username: data.username || 'Anonymous',
        avatar: data.avatar || null,
        stampCount: data.stampCount || 0,
        points: rawPoints,
        badge: badge
      };
    });

    // Sort by points descending
    leaderboard.sort((a, b) => b.points - a.points);

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /stamps/:userId -> get all stamps of a user (friends only)
router.get('/:userId', authMiddleware, async (req, res) => {
  const targetUid = req.params.userId;
  const uid = req.user.uid;

  try {
    // Check if friends
    const friendshipQuery = await db.collection('friendships')
      .where('users', 'array-contains', uid)
      .get();
    
    const isFriend = friendshipQuery.docs.some(doc => doc.data().users.includes(targetUid));
    
    if (!isFriend && targetUid !== uid) {
      return res.status(403).json({ error: 'You can only view stamps of mutual friends' });
    }

    const stampsQuery = await db.collection('stamps')
      .where('userId', '==', targetUid)
      .orderBy('timestamp', 'desc')
      .get();

    const stamps = stampsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(stamps);
  } catch (error) {
    console.error('Error fetching stamps:', error);
    res.status(500).json({ error: 'Failed to fetch stamps' });
  }
});

// DELETE /stamps/:stampId -> delete own stamp
router.delete('/:stampId', authMiddleware, async (req, res) => {
  const { stampId } = req.params;
  const uid = req.user.uid;

  try {
    const stampRef = db.collection('stamps').doc(stampId);
    const stampDoc = await stampRef.get();

    if (!stampDoc.exists) return res.status(404).json({ error: 'Stamp not found' });
    if (stampDoc.data().userId !== uid) return res.status(403).json({ error: 'Cannot delete others stamps' });

    await stampRef.delete();
    
    // Decrement stamp count and deduct 100 points
    await db.collection('users').doc(uid).update({
      stampCount: admin.firestore.FieldValue.increment(-1),
      points: admin.firestore.FieldValue.increment(-100)
    });

    res.status(200).json({ message: 'Stamp deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stamp' });
  }
});

// POST /stamps/:stampId/react -> add emoji reaction
router.post('/:stampId/react', authMiddleware, stampLimiter, async (req, res) => {
  const { stampId } = req.params;
  const uid = req.user.uid;

  // Validate stampId
  const idCheck = validateFirestoreId(stampId);
  if (!idCheck.ok) return res.status(400).json({ error: idCheck.error });

  // Validate emoji
  const emojiCheck = validateEmoji(req.body.emoji);
  if (!emojiCheck.ok) return res.status(400).json({ error: emojiCheck.error });
  const emoji = emojiCheck.value;

  try {
    const stampRef = db.collection('stamps').doc(stampId);
    const stampDoc = await stampRef.get();
    if (!stampDoc.exists) return res.status(404).json({ error: 'Stamp not found' });
    const stampData = stampDoc.data();
    
    const update = {};
    update[`reactions.${uid}`] = emoji; // Store user's reaction

    await stampRef.update(update);
    
    // Award 20 points to the creator of the stamp
    await db.collection('users').doc(stampData.userId).update({
      points: admin.firestore.FieldValue.increment(20)
    });

    res.status(200).json({ message: 'Reaction added' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// DELETE /stamps/:stampId/react -> remove own reaction
router.delete('/:stampId/react', authMiddleware, stampLimiter, async (req, res) => {
  const { stampId } = req.params;
  const uid = req.user.uid;

  try {
    const stampRef = db.collection('stamps').doc(stampId);
    const stampDoc = await stampRef.get();
    if (!stampDoc.exists) return res.status(404).json({ error: 'Stamp not found' });
    const stampData = stampDoc.data();

    await stampRef.update({
      [`reactions.${uid}`]: admin.firestore.FieldValue.delete()
    });

    // Deduct 20 points from the creator of the stamp
    await db.collection('users').doc(stampData.userId).update({
      points: admin.firestore.FieldValue.increment(-20)
    });

    res.status(200).json({ message: 'Reaction removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// POST /stamps/:stampId/photos -> upload/add photos to a stamp
router.post('/:stampId/photos', authMiddleware, stampLimiter, async (req, res) => {
  const { stampId } = req.params;
  const { photos } = req.body;
  const uid = req.user.uid;

  try {
    const stampRef = db.collection('stamps').doc(stampId);
    const stampDoc = await stampRef.get();
    if (!stampDoc.exists) return res.status(404).json({ error: 'Stamp not found' });

    const newPhotos = Array.isArray(photos) ? photos : [photos];

    const photosCheck = validatePhotos(newPhotos);
    if (!photosCheck.ok) return res.status(400).json({ error: photosCheck.error });

    await stampRef.update({
      images: admin.firestore.FieldValue.arrayUnion(...photosCheck.value)
    });

    res.status(200).json({ message: 'Photos uploaded successfully' });
  } catch (error) {
    console.error('Failed to upload photos to stamp:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

module.exports = router;
