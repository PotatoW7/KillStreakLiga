const express = require('express');
const fetch = require('node-fetch');
const { regionDomains, accountRouting } = require('../utils/regions');
const router = express.Router();

const API_KEY = process.env.RIOT_API_KEY;

router.get('/spectator/:region/:puuid', async (req, res) => {
  const { region, puuid } = req.params;
  const platformDomain = regionDomains[region];

  if (!platformDomain) {
    return res.status(400).json({ error: 'Unsupported region' });
  }

  try {
    const spectatorRes = await fetch(
      `https://${platformDomain}/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${API_KEY}`
    );

    if (spectatorRes.status === 404) {
      return res.json({ inGame: false });
    }

    if (!spectatorRes.ok) {
      return res.json({ inGame: false });
    }

    const spectatorData = await spectatorRes.json();

    res.json({
      inGame: true,
      gameMode: spectatorData.gameMode,
      gameType: spectatorData.gameType,
      gameQueueConfigId: spectatorData.gameQueueConfigId,
      gameLength: spectatorData.gameLength,
      gameStartTime: spectatorData.gameStartTime,
      mapId: spectatorData.mapId,
      participants: spectatorData.participants.map(p => ({
        puuid: p.puuid,
        championId: p.championId,
        teamId: p.teamId,
        riotId: p.riotId || 'Unknown',
        spell1Id: p.spell1Id,
        spell2Id: p.spell2Id,
        perks: p.perks
      })),
      bannedChampions: spectatorData.bannedChampions || []
    });
  } catch (err) {
    console.error('Spectator endpoint error:', err);
    res.json({ inGame: false });
  }
});

router.get('/:region/:gameName/:tagLine', async (req, res) => {
  const { region, gameName, tagLine } = req.params;
  console.log(`Incoming request for ${gameName}#${tagLine} in ${region}`);

  const platformDomain = regionDomains[region];
  const routingRegion = accountRouting[region];

  if (!platformDomain || !routingRegion) {
    return res.status(400).json({ error: 'Unsupported region' });
  }

  try {
    const accountRes = await fetch(
      `https://${routingRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${API_KEY}`
    );

    if (!accountRes.ok) {
      const errorData = await accountRes.json();
      return res.status(accountRes.status).json({ error: errorData.error || 'Summoner not found or invalid Riot ID' });
    }

    const accountData = await accountRes.json();
    const puuid = accountData.puuid;

    const summonerRes = await fetch(
      `https://${platformDomain}/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${API_KEY}`
    );

    if (!summonerRes.ok) {
      const errorData = await summonerRes.json();
      return res.status(summonerRes.status).json({ error: errorData.error || 'Failed to fetch summoner data' });
    }

    const summonerData = await summonerRes.json();

    const rankedRes = await fetch(
      `https://${platformDomain}/lol/league/v4/entries/by-puuid/${puuid}?api_key=${API_KEY}`
    );

    const rankedData = rankedRes.ok ? await rankedRes.json() : [];

    const masteryRes = await fetch(
      `https://${platformDomain}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}?api_key=${API_KEY}`
    );

    const masteryData = masteryRes.ok ? await masteryRes.json() : [];

    console.log('Mastery data:', masteryData.slice(0, 5));

    res.json({
      name: `${accountData.gameName}#${accountData.tagLine}`,
      puuid,
      summonerLevel: summonerData.summonerLevel,
      profileIconId: summonerData.profileIconId,
      ranked: rankedData,
      mastery: masteryData.slice(0, 5)
    });

  } catch (err) {
    console.error('Summoner endpoint error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

