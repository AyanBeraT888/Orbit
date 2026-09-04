const { db } = require('../config/firebase');

const checkAccessTier = (requiredTier) => {
  return async (req, res, next) => {
    try {
      const uid = req.user.uid;
      const userDoc = await db.collection('users').doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      req.appUser = userData; // Attach full user data for convenience
      next();
    } catch (error) {
      console.error('Access Tier Middleware Error:', error);
      res.status(500).json({ error: 'Failed to verify access level' });
    }
  };
};

module.exports = { checkAccessTier };
