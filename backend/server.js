const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ override: true });

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(u => u.replace(/['"]+/g, '')) : [])
].map(origin => origin.trim().replace(/\/$/, ""));

console.log('CORS Allowed Origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.indexOf(normalizedOrigin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' }));

app.use(express.static(path.join(__dirname, 'public')));

const summonerRouter = require('./routes/summoner');
app.use('/summoner-info', summonerRouter);

const queueRoutes = require('./routes/queue');
app.use('/api/queue', queueRoutes);

const matchHistoryRouter = require('./routes/matchHistory');
app.use('/match-history', matchHistoryRouter);

const admin = require('firebase-admin');

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
} else {
  admin.initializeApp();
}



app.delete('/api/admin/users/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    await admin.auth().deleteUser(uid);
    res.json({ message: 'Successfully deleted user from Auth' });
  } catch (error) {
    console.error('Error deleting user from Auth:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});