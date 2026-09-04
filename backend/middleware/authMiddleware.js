const { auth } = require('../config/firebase');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Graceful check for mock tokens in local development
    if (process.env.NODE_ENV !== 'production') {
      if (token === 'mock_token') {
        req.user = { uid: 'test-user-id', email: 'test@example.com' };
        return next();
      }
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error.message || error);
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        console.log('DEBUG [Auth Token Claims]:', {
          iss: payload.iss,
          aud: payload.aud,
          sub: payload.sub,
          exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null
        });
      }
    } catch (decodeError) {
      console.error('Failed to decode token for debugging:', decodeError.message);
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

module.exports = authMiddleware;
