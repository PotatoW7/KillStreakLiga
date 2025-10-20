const express = require('express');
const fetch = require('node-fetch');
const { regionDomains, accountRouting } = require('../utils/regions');
const router = express.Router();

const API_KEY = process.env.RIOT_API_KEY;

const queueMap = {
  solo_duo: 420,
  ranked_flex: 440,
  draft: 400,
  aram: 450,
  swiftplay: 480,
  arena: 1700
};

router.get('/:region/:puuid', async (req, res) => {
  const { region, puuid } = req.params;
  const mode = req.query.mode;

  const platformDomain = regionDomains[region];
  const routingRegion = accountRouting[region];
  const queueId = queueMap[mode];

  if (!platformDomain || !routingRegion) {
    return res.status(400).json({ error: 'Invalid region or game mode' });
  }

  try {
    const matchListRes = await fetch(
      `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20&api_key=${API_KEY}`
    );
    if (!matchListRes.ok) throw new Error('Failed to fetch match list');

    const matchIds = await matchListRes.json();
    const recentGames = [];

    for (const matchId of matchIds) {
      const matchRes = await fetch(
        `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${API_KEY}`
      );
      if (!matchRes.ok) continue;

      const matchData = await matchRes.json();
      const info = matchData.info;

      if (info.gameDuration < 300) continue; // skip remakes

      const isSwiftplay = info.queueId === 480 || info.gameMode === 'SWIFTPLAY';
      const isArena = info.queueId === 1700 || info.gameMode === 'CHERRY';
      const isMatch =
        mode === 'all' ||
        (mode === 'swiftplay' && isSwiftplay) ||
        (mode === 'arena' && isArena) ||
        (mode !== 'swiftplay' && mode !== 'arena' && info.queueId === queueId);

      if (!isMatch) continue;

      const enrichedParticipants = info.participants.map(p => ({
        ...p,
        riotId: `${p.riotIdGameName || p.summonerName || 'Unknown'}#${p.riotIdTagline || ''}`,
        placement: p.placement,
        teamId: p.teamId,
        items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5],
        trinket: p.item6,
        win: p.win
        
      }));

      recentGames.push({
        gameDuration: info.gameDuration,
        gameMode: info.gameMode,
        queueId: info.queueId,
        players: enrichedParticipants
      });

      if (recentGames.length === 2) break;
    }

    res.json({ mode, recentGames });

  } catch (err) {
    console.error('Match history error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;