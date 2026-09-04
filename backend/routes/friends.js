const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/authMiddleware');
const { friendRequestLimiter } = require('../middleware/rateLimiter');
const { validateUUID } = require('../middleware/sanitize');

// POST /friends/request -> send friend request
router.post('/request', authMiddleware, friendRequestLimiter, async (req, res) => {
  const { targetUserId } = req.body; // UUID of target
  const senderUid = req.user.uid;

  // Validate that targetUserId is a proper UUID
  const idCheck = validateUUID(targetUserId);
  if (!idCheck.ok) return res.status(400).json({ error: `targetUserId: ${idCheck.error}` });

  try {
    // Get sender's full data to get their UUID
    const senderDoc = await db.collection('users').doc(senderUid).get();
    const senderData = senderDoc.data();

    // Find target user by UUID
    const targetQuery = await db.collection('users').where('uuid', '==', idCheck.value).get();
    if (targetQuery.empty) return res.status(404).json({ error: 'User not found' });
    
    const targetUid = targetQuery.docs[0].id;

    if (senderUid === targetUid) return res.status(400).json({ error: 'Cannot friend yourself' });

    // Check for existing blocks
    const blockDoc = await db.collection('blocks').doc(`${targetUid}_${senderUid}`).get();
    if (blockDoc.exists && blockDoc.data().permanent) {
      return res.status(403).json({ error: 'You are permanently blocked from requesting this user' });
    }

    // Check for cooldown
    if (blockDoc.exists && blockDoc.data().cooldownUntil > new Date().toISOString()) {
      return res.status(403).json({ error: 'You are in a 30-day cooldown period with this user' });
    }

    // Check if already friends
    const friendshipCheck = await db.collection('friendships')
      .where('users', 'array-contains', senderUid)
      .get();
    const isAlreadyFriend = friendshipCheck.docs.some(doc => doc.data().users.includes(targetUid));
    if (isAlreadyFriend) return res.status(400).json({ error: 'Already friends' });

    // Send request
    const requestId = `${senderUid}_${targetUid}`;
    await db.collection('friendRequests').doc(requestId).set({
      senderUid,
      targetUid,
      senderUsername: senderData.username,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Notify via socket
    const io = req.app.get('socketio');
    io.to(targetUid).emit('request_received', { senderUsername: senderData.username });

    res.status(200).json({ message: 'Friend request sent' });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// POST /friends/accept/:requestId
router.post('/accept/:requestId', authMiddleware, async (req, res) => {
  const { requestId } = req.params;
  const targetUid = req.user.uid;

  try {
    const requestRef = db.collection('friendRequests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists || requestDoc.data().targetUid !== targetUid) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { senderUid } = requestDoc.data();

    // Create mutual friendship
    await db.collection('friendships').add({
      users: [senderUid, targetUid],
      createdAt: new Date().toISOString()
    });

    // Delete request
    await requestRef.delete();

    res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// POST /friends/decline/:requestId
router.post('/decline/:requestId', authMiddleware, async (req, res) => {
  const { requestId } = req.params;
  const targetUid = req.user.uid;

  try {
    const requestRef = db.collection('friendRequests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists || requestDoc.data().targetUid !== targetUid) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { senderUid } = requestDoc.data();

    // Record decline count and timestamp
    const blockRef = db.collection('blocks').doc(`${targetUid}_${senderUid}`);
    const blockDoc = await blockRef.get();
    
    let declineCount = 1;
    let permanent = false;
    let cooldownUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (blockDoc.exists) {
      declineCount = (blockDoc.data().declineCount || 0) + 1;
      if (declineCount >= 2) permanent = true;
    }

    await blockRef.set({
      declineCount,
      permanent,
      cooldownUntil,
      updatedAt: new Date().toISOString()
    });

    await requestRef.delete();

    res.status(200).json({ message: 'Friend request declined' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

// DELETE /friends/:friendId -> remove friend (friendId is UID here for internal, but prompt says friendId)
router.delete('/:friendId', authMiddleware, async (req, res) => {
  const friendUid = req.params.friendId;
  const uid = req.user.uid;

  try {
    const friendshipQuery = await db.collection('friendships')
      .where('users', 'array-contains', uid)
      .get();
    
    const friendshipDoc = friendshipQuery.docs.find(doc => doc.data().users.includes(friendUid));

    if (friendshipDoc) {
      await friendshipDoc.ref.delete();
      // Revoke location access is implicit as we only show location to mutual friends
      res.status(200).json({ message: 'Friend removed' });
    } else {
      res.status(404).json({ error: 'Friendship not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// POST /friends/block/:userId
router.post('/block/:userId', authMiddleware, async (req, res) => {
  const targetUid = req.params.userId;
  const uid = req.user.uid;

  try {
    // 1. Remove friendship if exists
    const friendshipQuery = await db.collection('friendships')
      .where('users', 'array-contains', uid)
      .get();
    const friendshipDoc = friendshipQuery.docs.find(doc => doc.data().users.includes(targetUid));
    if (friendshipDoc) await friendshipDoc.ref.delete();

    // 2. Add to permanent block
    await db.collection('blocks').doc(`${uid}_${targetUid}`).set({
      permanent: true,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// GET /friends/list -> return all friends with online status
router.get('/list', authMiddleware, async (req, res) => {
  const uid = req.user.uid;
  const io = req.app.get('socketio');

  try {
    const friendshipQuery = await db.collection('friendships')
      .where('users', 'array-contains', uid)
      .get();

    const friendIds = friendshipQuery.docs.map(doc => {
      const users = doc.data().users;
      return users.find(id => id !== uid);
    });

    if (friendIds.length === 0) return res.status(200).json([]);

    const friendsData = await Promise.all(friendIds.map(async (id) => {
      const userDoc = await db.collection('users').doc(id).get();
      const userData = userDoc.data();
      // Check online status from socket.io
      const isOnline = io.sockets.adapter.rooms.has(id); 
      return {
        uuid: userData.uuid,
        username: userData.username,
        avatar: userData.avatar,
        online: isOnline
      };
    }));

    res.status(200).json(friendsData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// GET /friends/requests -> return pending incoming requests
router.get('/requests', authMiddleware, async (req, res) => {
  const uid = req.user.uid;

  try {
    const requestsQuery = await db.collection('friendRequests')
      .where('targetUid', '==', uid)
      .get();

    const requests = requestsQuery.docs.map(doc => ({
      requestId: doc.id,
      ...doc.data()
    }));

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /friends/sent -> return sent requests with expiry time
router.get('/sent', authMiddleware, async (req, res) => {
  const uid = req.user.uid;

  try {
    const requestsQuery = await db.collection('friendRequests')
      .where('senderUid', '==', uid)
      .get();

    const requests = requestsQuery.docs.map(doc => ({
      requestId: doc.id,
      ...doc.data()
    }));

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sent requests' });
  }
});

module.exports = router;
