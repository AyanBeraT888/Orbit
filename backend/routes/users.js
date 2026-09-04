const express = require('express');
const router = express.Router();
const { db, admin, auth } = require('../config/firebase');
const authMiddleware = require('../middleware/authMiddleware');
const { searchLimiter } = require('../middleware/rateLimiter');
const {
  validateUsername,
  validateEmail,
  validatePhone,
  validateUUID,
  sanitizeSearchQuery,
} = require('../middleware/sanitize');

// GET /users/:id -> get public profile by UUID
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  // Validate UUID format before hitting Firestore
  const idCheck = validateUUID(id);
  if (!idCheck.ok) return res.status(400).json({ error: idCheck.error });

  try {
    const userQuery = await db.collection('users').where('uuid', '==', idCheck.value).get();
    
    if (userQuery.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userQuery.docs[0].data();
    res.status(200).json({
      username: userData.username,
      avatar: userData.avatar,
      stampCount: userData.stampCount,
      joinDate: userData.joinDate
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /users/username -> change username
router.patch('/username', authMiddleware, async (req, res) => {
  const uid = req.user.uid;

  const usernameCheck = validateUsername(req.body.newUsername);
  if (!usernameCheck.ok) return res.status(400).json({ error: usernameCheck.error });
  const newUsername = usernameCheck.value;

  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const changeCount = userData.usernameChangeCount || 0;
    if (changeCount >= 3) {
      return res.status(403).json({ error: 'username_change_paid_required' });
    }

    const oldUsername = userData.username;
    
    // Check if new username is taken
    const usernameQuery = await db.collection('users').where('username', '==', newUsername).get();
    if (!usernameQuery.empty) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    await userRef.update({
      username: newUsername,
      usernameChangeCount: changeCount + 1
    });

    // Notify all friends via Socket.io
    const io = req.app.get('socketio');
    const friendsQuery = await db.collection('friendships')
      .where('users', 'array-contains', uid)
      .get();

    friendsQuery.forEach(doc => {
      const friendship = doc.data();
      const friendId = friendship.users.find(id => id !== uid);
      io.to(friendId).emit('username_changed', { oldUsername, newUsername });
    });

    res.status(200).json({ message: 'Username updated successfully', newUsername });
  } catch (error) {
    console.error('Error changing username:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

// GET /users/search?q= -> search by exact username or unique ID
router.get('/search', authMiddleware, searchLimiter, async (req, res) => {
  const qCheck = sanitizeSearchQuery(req.query.q);
  if (!qCheck.ok) return res.status(400).json({ error: qCheck.error });
  const q = qCheck.value;

  try {
    // Search by username
    let userQuery = await db.collection('users').where('username', '==', q).get();
    
    // If not found, search by UUID
    if (userQuery.empty) {
      userQuery = await db.collection('users').where('uuid', '==', q).get();
    }

    if (userQuery.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userQuery.docs[0].data();
    res.status(200).json({
      uuid: userData.uuid,
      username: userData.username,
      avatar: userData.avatar
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// DELETE /users/account -> delete account and all associated data
router.delete('/account', authMiddleware, async (req, res) => {
  const uid = req.user.uid;

  try {
    // 1. Delete user document
    await db.collection('users').doc(uid).delete();

    // 2. Delete location data
    await db.collection('locations').doc(uid).delete();

    // 3. Delete friendships
    const friendshipQuery = await db.collection('friendships')
      .where('users', 'array-contains', uid)
      .get();
    const batch = db.batch();
    friendshipQuery.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // 4. Delete stamps
    const stampQuery = await db.collection('stamps').where('userId', '==', uid).get();
    const stampBatch = db.batch();
    stampQuery.forEach(doc => stampBatch.delete(doc.ref));
    await stampBatch.commit();

    // 5. Delete Firebase Auth user
    await auth.deleteUser(uid);

    res.status(200).json({ message: 'Account and all data deleted' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// PATCH /users/email -> update email
router.patch('/email', authMiddleware, async (req, res) => {
  const uid = req.user.uid;

  const emailCheck = validateEmail(req.body.newEmail);
  if (!emailCheck.ok) return res.status(400).json({ error: emailCheck.error });
  const newEmail = emailCheck.value;

  try {
    await admin.auth().updateUser(uid, { email: newEmail });
    const userRef = db.collection('users').doc(uid);
    await userRef.update({ email: newEmail });
    res.status(200).json({ message: 'Email updated successfully', email: newEmail });
  } catch (error) {
    console.error('Email update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update email' });
  }
});

// PATCH /users/phone -> update phone number
router.patch('/phone', authMiddleware, async (req, res) => {
  const uid = req.user.uid;

  const phoneCheck = validatePhone(req.body.newPhone);
  if (!phoneCheck.ok) return res.status(400).json({ error: phoneCheck.error });
  const newPhone = phoneCheck.value;

  try {
    await admin.auth().updateUser(uid, { phoneNumber: newPhone });
    const userRef = db.collection('users').doc(uid);
    await userRef.update({ phoneNumber: newPhone, access_tier: 'full', phone_verified: true });
    res.status(200).json({ message: 'Phone updated successfully', phoneNumber: newPhone });
  } catch (error) {
    console.error('Phone update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update phone' });
  }
});

module.exports = router;
