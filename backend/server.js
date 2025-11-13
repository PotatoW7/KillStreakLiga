const express = require('express');
const path = require('path');
const cors = require('cors'); // Add this line
require('dotenv').config({ override: true });

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));

app.use(express.json()); 

app.use(express.static(path.join(__dirname, 'public')));

const summonerRouter = require('./routes/summoner');
app.use('/summoner-info', summonerRouter);

const queueRoutes = require('./routes/queue');
app.use('/api/queue', queueRoutes);

const matchHistoryRouter = require('./routes/matchHistory');
app.use('/match-history', matchHistoryRouter);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});