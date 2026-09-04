const { db, admin } = require('../config/firebase');

const locationSocket = (io) => {
  // Middleware to verify token
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      socket.uid = decodedToken.uid;
      next();
    } catch (error) {
      console.error('Socket Auth Error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id, 'UID:', socket.uid);

    // join_room -> user joins their personal room on connect
    socket.on('join_room', () => {
      const uid = socket.uid;
      socket.join(uid);
      console.log(`User ${uid} joined room`);
      
      // Notify friends that user is online
      broadcastToFriends(uid, 'friend_online', { uid });
    });

    // location_update -> sends new lat lng every 15 seconds
    socket.on('location_update', async (data) => {
      const { lat, lng, privacy = 'friends' } = data;
      const uid = socket.uid;
      if (lat === undefined || lng === undefined) return;

      try {
        await db.collection('locations').doc(uid).set({
          uid,
          lat,
          lng,
          isSharing: true,
          mode: 'exact',
          privacy,
          updatedAt: new Date().toISOString()
        });

        // Broadcast based on privacy level
        if (privacy === 'friends') {
          broadcastToFriends(uid, 'friend_location', { uid, lat, lng });
        } else if (privacy === 'all') {
          // Broadcast to everyone
          io.emit('friend_location', { uid, lat, lng });
        }
        // If 'only_me', we don't broadcast at all
      } catch (error) {
        console.error('Socket location update error:', error);
      }
    });

    // stop_sharing -> user stops sharing
    socket.on('stop_sharing', async () => {
      const uid = socket.uid;

      try {
        await db.collection('locations').doc(uid).set({
          isSharing: false,
          stoppedAt: new Date().toISOString()
        }, { merge: true });

        broadcastToFriends(uid, 'friend_stopped', { uid });
      } catch (error) {
        console.error('Socket stop sharing error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });

    // Utility to broadcast to mutual friends
    async function broadcastToFriends(uid, event, data) {
      try {
        const friendships = await db.collection('friendships')
          .where('users', 'array-contains', uid)
          .get();

        friendships.forEach(doc => {
          const friendId = doc.data().users.find(id => id !== uid);
          io.to(friendId).emit(event, data);
        });
      } catch (error) {
        console.error('Error broadcasting to friends:', error);
      }
    }
  });
};

module.exports = locationSocket;
