const express = require('express');
const fetch = require('node-fetch');
const { regionDomains } = require('../utils/regions');
const router = express.Router();

const API_KEY = process.env.RIOT_API_KEY;

const queueMap = {
  ranked_solo: 420,
  ranked_flex: 440,
  normal: [400, 430],
  aram: 450,
  swiftplay: 490
};

router.get('/:region/:puuid', async (req, res) => {
  const { region, puuid } = req.params;
  const mode = req.query.mode;

  const platformDomain = regionDomains[region];
  if (!platformDomain) return res.status(400).json({ error: 'Unsupported region' });

  const queueIds = queueMap[mode];
  if (!queueIds) return res.status(400).json({ error: 'Unsupported game mode' });

  try {
    console.log(`Fetching match history for ${puuid} in ${region}, mode: ${mode}`);

    const matchListRes = await fetch(
      `https://${platformDomain}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=100&api_key=${API_KEY}`
    );
    const matchIds = await matchListRes.json();

    const filteredMatches = [];
    for (const matchId of matchIds) {
      const matchRes = await fetch(
        `https://${platformDomain}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${API_KEY}`
      );
      if (!matchRes.ok) {
        console.warn(`Failed to fetch match ${matchId}: ${matchRes.status}`);
        continue;
      }

      const matchData = await matchRes.json();
      const queueId = matchData.info.queueId;

      if (Array.isArray(queueIds) ? queueIds.includes(queueId) : queueId === queueIds) {
        filteredMatches.push(matchData);
        if (filteredMatches.length === 20) break;
      }
    }

    console.log(`Filtered ${filteredMatches.length} matches for mode ${mode}`);

    let wins = 0;
    let losses = 0;

    for (const match of filteredMatches) {
      const participant = match.info.participants.find(p => p.puuid === puuid);
      if (participant?.win) wins++;
      else losses++;
    }

    const total = wins + losses;
    const winrate = total > 0 ? Math.round((wins / total) * 100) : 0;

    res.json({ mode, wins, losses, winrate });

  } catch (err) {
    console.error('Match history error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
