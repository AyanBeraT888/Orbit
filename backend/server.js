const express = require('express');
const http = require('http');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const { db } = require('./config/firebase');
const initCleanupJobs = require('./utils/cleanup');
const locationSocket = require('./sockets/locationSocket');
const { spawn } = require('child_process');
const path = require('path');

// Spawn Python Geo-Addressing Service
let pythonProcess = null;
const startPythonService = () => {
  console.log('Starting Python Geo-Addressing Service...');
  const venvPython = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
  pythonProcess = spawn(venvPython, [
    '-m', 'uvicorn', 'geo_addressing.api:app', '--host', '127.0.0.1', '--port', '0'
  ], {
    cwd: __dirname,
    env: { ...process.env, PYTHONPATH: __dirname }
  });

  const parseUvicornPort = (data) => {
    const output = data.toString();
    const match = output.match(/Uvicorn running on (http:\/\/[^:\s]+:\d+)/);
    if (match) {
      process.env.GEO_ADDRESSING_SERVICE_URL = match[1];
      console.log(`[Geo-Addressing]: Service registered at ${match[1]}`);
    }
    return output;
  };

  pythonProcess.stdout.on('data', (data) => {
    const output = parseUvicornPort(data);
    console.log(`[Geo-Addressing]: ${output.trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    const output = parseUvicornPort(data);
    console.error(`[Geo-Addressing Error]: ${output.trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python Geo-Addressing process exited with code ${code}`);
  });
};

startPythonService();

// Handle graceful shutdown
process.on('SIGINT', () => {
  if (pythonProcess) {
    console.log('Killing Python Geo-Addressing Service...');
    pythonProcess.kill('SIGINT');
  }
  process.exit(0);
});
process.on('SIGTERM', () => {
  if (pythonProcess) {
    console.log('Killing Python Geo-Addressing Service...');
    pythonProcess.kill('SIGTERM');
  }
  process.exit(0);
});
process.on('exit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Strict origin
    methods: ["GET", "POST"]
  }
});

// Security & Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:             ["'self'"],
      scriptSrc:              ["'self'"],                              // no inline scripts
      styleSrc:               ["'self'", "'unsafe-inline'"],          // MapLibre injects inline styles
      imgSrc:                 ["'self'", "data:", "blob:", "https:"], // tile images from external CDNs
      connectSrc:             ["'self'", "wss:", "https:"],           // WebSocket + external API calls
      fontSrc:                ["'self'", "https://fonts.gstatic.com"],
      objectSrc:              ["'none'"],                             // block Flash/plugin embeds
      frameSrc:               ["'none'"],
      baseUri:                ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  // MapLibre GL loads cross-origin tile resources; COEP would block them
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ['GET', 'POST', 'PATCH', 'DELETE']
}));
app.use(express.json({ limit: '10kb' }));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Apply the rate limiting middleware to all requests
app.use(globalLimiter);


// Reject HTTP in production (assuming proxy handles HTTPS or process.env.NODE_ENV)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.status(400).json({ error: 'HTTPS required' });
  }
  next();
});

// Suspicious Activity Tracker Middleware
const activityTracker = async (req, res, next) => {
  if (req.user) {
    const uid = req.user.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const now = new Date();
      const lastAction = new Date(userData.lastActionTimestamp || 0);
      
      let actions = userData.actionsInLastHour || 0;
      
      // Reset counter if more than an hour has passed
      if (now - lastAction > 3600000) {
        actions = 1;
      } else {
        actions += 1;
      }

      await userRef.update({
        actionsInLastHour: actions,
        lastActionTimestamp: now.toISOString()
      });

      if (actions > 50 && (now - new Date(userData.joinDate) < 24 * 3600000)) {
        // Suspend new accounts with high activity
        await userRef.update({ isSuspended: true });
        return res.status(403).json({ error: 'Account suspended for suspicious activity' });
      }
    }
  }
  next();
};

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const locationRoutes = require('./routes/location');
const groupRoutes = require('./routes/groups');
const stampRoutes = require('./routes/stamps');

app.use('/auth', authRoutes);
app.use('/users', activityTracker, userRoutes);
app.use('/friends', activityTracker, friendRoutes);
app.use('/location', activityTracker, locationRoutes);
app.use('/groups', activityTracker, groupRoutes);
app.use('/stamps', activityTracker, stampRoutes);

// Shared instances
app.set('socketio', io);

// Initialize Sockets
locationSocket(io);

// Initialize Cleanup Jobs
initCleanupJobs();

const PORT = process.env.PORT || 5500;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test Firestore Connection
  try {
    await db.collection('test').limit(1).get();
    console.log('✅ Firestore connection successful!');
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
    if (error.message.includes('NOT_FOUND')) {
      console.log('👉 Hint: Ensure your Firestore database is created in the Firebase Console and the Project ID is correct.');
    }
  }
});
