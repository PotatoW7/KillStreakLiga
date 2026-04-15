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
  arena: 1700,
  aram_mayhem: 2400,
  urf: 900,
};

function extractObjectives(teams) {
  const objectives = {};
  teams.forEach((team) => {
    objectives[team.teamId] = {
      dragon: team.objectives?.dragon?.kills || 0,
      baron: team.objectives?.baron?.kills || 0,
      riftHerald: team.objectives?.riftHerald?.kills || 0,
      voidGrubs: team.objectives?.voidGrubs?.kills || 0,
      tower: team.objectives?.tower?.kills || 0,
    };
  });
  return objectives;
}

router.get('/:region/:puuid', async (req, res) => {
  const { region, puuid } = req.params;
  const mode = req.query.mode;

  const platformDomain = regionDomains[region];
  const routingRegion = accountRouting[region];
  const queueId = queueMap[mode];

  if (!platformDomain || !routingRegion) {
    return res.status(400).json({ error: 'Invalid region' });
  }

  try {
    const isSpecialMode = mode === 'aram_mayhem';
    const effectiveQueueParam = (mode === 'all' || isSpecialMode) ? '' : `&queue=${queueId}`;
    const count = isSpecialMode ? 60 : 20;
    const matchListRes = await fetch(
      `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}${effectiveQueueParam}&api_key=${API_KEY}`
    );
    if (!matchListRes.ok) throw new Error('Failed to fetch match list');

    const matchIds = await matchListRes.json();
    if (matchIds.length === 0) return res.json({ mode, recentGames: [] });

    const matchPromises = matchIds.map(async (matchId) => {
      try {
        const matchRes = await fetch(
          `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${API_KEY}`
        );
        if (!matchRes.ok) return null;

        const matchData = await matchRes.json();
        const info = matchData.info;

        if (info.gameDuration < 300) return null;

        if (isSpecialMode && info.queueId !== 2400) return null;

        const objectives = extractObjectives(info.teams);
        const participantsWithRank = info.participants.map((p) => ({
          ...p,
          riotId: `${p.riotIdGameName || p.summonerName || 'Unknown'}#${p.riotIdTagline || ''}`,
          items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5],
          trinket: p.item6,
        }));

        const endTime = info.gameEndTimestamp || (info.gameStartTimestamp + info.gameDuration * 1000);

        return {
          gameDuration: info.gameDuration,
          gameMode: info.gameMode,
          queueId: info.queueId,
          players: participantsWithRank,
          teams: objectives,
          gameStartTimestamp: info.gameStartTimestamp,
          gameEndTimestamp: endTime,
        };
      } catch (err) {
        console.error(`Error fetching match ${matchId}:`, err);
        return null;
      }
    });

    const results = await Promise.all(matchPromises);
    const recentGames = results.filter(game => game !== null).slice(0, 20);

    res.json({ mode, recentGames });
  } catch (err) {
    console.error('Match history error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
