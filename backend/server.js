const express = require('express');
const path = require('path');
const cors = require('cors'); // Add this line
require('dotenv').config({ override: true });

const app = express();

// Add CORS middleware
app.use(cors({
  origin: 'http://localhost:5173', // Your Vite frontend URL
  credentials: true
}));

app.use(express.json()); 

app.use(express.static(path.join(__dirname, 'public')));

const summonerRouter = require('./routes/summoner');
app.use('/summoner-info', summonerRouter);

const matchHistoryRouter = require('./routes/matchHistory');
app.use('/match-history', matchHistoryRouter);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});