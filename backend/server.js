const express = require('express');
const path = require('path');
require('dotenv').config({ override: true });

const app = express();
app.use(express.json()); 

app.use(express.static(path.join(__dirname, 'public')));

const summonerRouter = require('./routes/summoner');
app.use('/summoner-info', summonerRouter);

const matchHistoryRouter = require('./routes/matchHistory');
app.use('/match-history', matchHistoryRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});
