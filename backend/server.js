const express = require('express');
const fetch = require('node-fetch');
const app = express();

const API_KEY = 'RGAPI-46f627a3-ea56-4fcf-8701-822ab0a55ee7';
app.use(express.static(__dirname));

const regionDomains = {
  br1: 'br1.api.riotgames.com',
  eun1: 'eun1.api.riotgames.com',
  euw1: 'euw1.api.riotgames.com',
  jp1: 'jp1.api.riotgames.com',
  kr: 'kr.api.riotgames.com',
  la1: 'la1.api.riotgames.com',
  la2: 'la2.api.riotgames.com',
  na1: 'na1.api.riotgames.com',
  oc1: 'oc1.api.riotgames.com',
  tr1: 'tr1.api.riotgames.com',
  ru: 'ru.api.riotgames.com',
  ph2: 'ph2.api.riotgames.com',
  sg2: 'sg2.api.riotgames.com',
  th2: 'th2.api.riotgames.com',
  tw2: 'tw2.api.riotgames.com',
  vn2: 'vn2.api.riotgames.com'
};

const accountRouting = {
  br1: 'americas',
  eun1: 'europe',
  euw1: 'europe',
  jp1: 'asia',
  kr: 'asia',
  la1: 'americas',
  la2: 'americas',
  na1: 'americas',
  oc1: 'sea',
  tr1: 'europe',
  ru: 'europe',
  ph2: 'sea',
  sg2: 'sea',
  th2: 'sea',
  tw2: 'sea',
  vn2: 'sea'
};

app.get('/summoner-info/:region/:gameName/:tagLine', async (req, res) => {
  const { region, gameName, tagLine } = req.params;
  const platformDomain = regionDomains[region];
  const routingRegion = accountRouting[region];

  if (!platformDomain || !routingRegion) {
    return res.status(400).json({ error: 'Unsupported region' });
  }

  try {
    const accountRes = await fetch(`https://${routingRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${API_KEY}`);
    if (!accountRes.ok) throw new Error(`Account fetch failed: ${accountRes.status}`);
    const accountData = await accountRes.json();
    const puuid = accountData.puuid;

    const summonerRes = await fetch(`https://${platformDomain}/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${API_KEY}`);
    if (!summonerRes.ok) throw new Error(`Summoner fetch failed: ${summonerRes.status}`);
    const summonerData = await summonerRes.json();

    const rankedRes = await fetch(`https://${platformDomain}/lol/league/v4/entries/by-puuid/${puuid}?api_key=${API_KEY}`);
    const rankedData = rankedRes.ok ? await rankedRes.json() : [];

    res.json({
      name: `${accountData.gameName}#${accountData.tagLine}`,
      puuid: puuid,
      summonerLevel: summonerData.summonerLevel,
      profileIconId: summonerData.profileIconId,
      ranked: rankedData
    });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/match-history/:region/:puuid', async (req, res) => {
  const { region, puuid } = req.params;
  const routingRegion = accountRouting[region];
  const platformDomain = regionDomains[region];
  const count = 2; // Only want 2 matches
  const queueId = req.query.queueId || 'all';

  if (!routingRegion || !platformDomain) {
    return res.status(400).json({ error: 'Unsupported region' });
  }

  try {
    const matchDetails = [];
    let start = 0;
    const batchSize = 30;
    const maxMatches = 300;

    while (start < maxMatches) {
      const matchListRes = await fetch(`https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${batchSize}&api_key=${API_KEY}`);
      if (!matchListRes.ok) break;

      const matchIds = await matchListRes.json();
      if (matchIds.length === 0) break;

      for (const matchId of matchIds) {
        const matchRes = await fetch(`https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${API_KEY}`);
        if (!matchRes.ok) continue;

        const matchData = await matchRes.json();

        const isSwiftplay = matchData.info.gameMode === 'SWIFTPLAY';
        const isQueueMatch = matchData.info.queueId?.toString() === queueId;

        if (queueId !== 'all' && !isQueueMatch && !isSwiftplay) continue;

        const enrichedParticipants = await Promise.all(
          matchData.info.participants.map(async (p) => {
            try {
              const accountRes = await fetch(`https://${routingRegion}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${p.puuid}?api_key=${API_KEY}`);
              if (accountRes.ok) {
                const accountData = await accountRes.json();
                p.riotId = `${accountData.gameName}#${accountData.tagLine}`;
              } else {
                p.riotId = 'Unknown#0000';
              }
            } catch {
              p.riotId = 'Unknown#0000';
            }
            return p;
          })
        );

        matchData.info.participants = enrichedParticipants;
        matchDetails.push(matchData);

        if (matchDetails.length >= count) break;
      }

      if (matchDetails.length >= count) break;
      start += batchSize;
    }

    res.json({ matches: matchDetails });

  } catch (err) {
    console.error('Match history error:', err);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
