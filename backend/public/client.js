document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchBtn').addEventListener('click', getSummonerInfo);
  renderRecentSearches();
});

async function getSummonerInfo() {
  const riotId = document.getElementById('riotId').value.trim();
  const region = document.getElementById('region').value;
  const mode = document.getElementById('mode').value.split(':')[0];
  const output = document.getElementById('output');
  const loading = document.getElementById('loading');

  output.innerHTML = '';
  loading.style.display = 'block';

  const [gameName, tagLine] = riotId.split('#');
  if (!gameName || !tagLine || !region) {
    output.textContent = 'Please enter Riot ID in format: Name#Tag and select a region.';
    return;
  }

  saveRecentSearch(riotId);

  try {
    const versionRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await versionRes.json();
    const latestVersion = versions[0];

    const champDataRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
    const champData = await champDataRes.json();
    const champIdToName = {};
    const champNameToId = {};
    Object.values(champData.data).forEach(champ => {
      const id = parseInt(champ.key);
      champIdToName[id] = champ.id;
      champNameToId[champ.id] = id;
    });

    const summonerRes = await fetch(`/summoner-info/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
    if (!summonerRes.ok) throw new Error('Summoner not found or API error.');
    const data = await summonerRes.json();

    const matchRes = await fetch(`/match-history/${region}/${data.puuid}?mode=${mode}`);
    const matchData = await matchRes.json();
    const matches = matchData.recentGames || [];

    const rankedSolo = data.ranked?.find(q => q.queueType === 'RANKED_SOLO_5x5');
    const rankedFlex = data.ranked?.find(q => q.queueType === 'RANKED_FLEX_SR');
    const masteryData = data.mastery || [];

    const winrateMap = {};
    matches.forEach(match => {
      match.players.forEach(p => {
        if (p.puuid === data.puuid) {
          const champId = champNameToId[p.championName];
          if (!champId) return;
          if (!winrateMap[champId]) winrateMap[champId] = { wins: 0, games: 0 };
          winrateMap[champId].games += 1;
          if (p.win) winrateMap[champId].wins += 1;
        }
      });
    });

    const formatRank = (rank) => {
      if (!rank) return '<div class="rank-block">Unranked</div>';
      const winrate = rank.wins + rank.losses > 0
        ? Math.round((rank.wins / (rank.wins + rank.losses)) * 100)
        : 0;
      return `
        <div class="rank-block">
          <strong>${rank.queueType === 'RANKED_SOLO_5x5' ? 'Solo/Duo' : 'Flex'}:</strong><br>
          ${rank.tier} ${rank.rank} — ${rank.leaguePoints} LP<br>
          ${rank.wins}W / ${rank.losses}L (${winrate}% WR)
        </div>
      `;
    };

    const formatMastery = (entry) => {
      const champName = champIdToName[entry.championId] || `ID ${entry.championId}`;
      const champIcon = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champName}.png`;
      const winStats = winrateMap[entry.championId];
      const winrate = winStats && winStats.games > 0
        ? Math.round((winStats.wins / winStats.games) * 100)
        : 'N/A';
      return `
        <div class="rank-block" style="display: flex; align-items: center; gap: 12px;">
          <img src="${champIcon}" alt="${champName}" width="48" height="48" style="border-radius: 6px;">
          <div>
            <strong>${champName}</strong><br>
            Mastery Level: ${entry.championLevel}<br>
            Points: ${entry.championPoints.toLocaleString()}<br>
            
          </div>
        </div>
      `;
    };

    output.innerHTML = `
      <div class="summoner-card">
        <img src="https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/${data.profileIconId}.png" 
             alt="Summoner Icon" class="summoner-icon">
        <div class="summoner-info">
          <h3>${data.name}</h3>
          <p>Level ${data.summonerLevel}</p>
          ${formatRank(rankedSolo)}
          ${formatRank(rankedFlex)}
        </div>
      </div>
      <h4 style="color:#ffcc00;">Top Champion Masteries:</h4>
      ${masteryData.slice(0, 5).map(formatMastery).join('')}
    `;

    const renderItemIcons = (items, trinket, version) => {
      const itemHTML = items.map(id =>
        id > 0
          ? `<img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png" 
                   width="24" height="24" style="border: 1px solid white; border-radius: 4px; margin-right: 2px;">`
          : ''
      ).join('');
      const trinketHTML = trinket > 0
        ? `<img src="https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${trinket}.png" 
                 width="24" height="24" style="border: 1px solid white; border-radius: 4px; box-shadow: 0 0 4px #ffcc00;">`
        : '';
      return `<div class="item-row" style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">${itemHTML}${trinketHTML}</div>`;
    };

    const renderTeam = (team, side, version) => {
      const labelColor = side === 'blue' ? '#00c6ff' : '#ff4c4c';
      const teamWin = team[0]?.win;

      return `
        <div style="margin-top: 10px;">
          <h4 style="color: ${labelColor}; margin-bottom: 6px;">
            ${side === 'blue' ? 'Blue Side' : 'Red Side'} — 
            <span style="color: ${teamWin ? '#00ff88' : '#ff4c4c'};">
              ${teamWin ? 'Victory' : 'Defeat'}
            </span>
          </h4>
          <div class="team-grid">
            ${team.map(p => {
              const champIcon = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${p.championName}.png`;
              return `
                <div class="player-card" style="border-left: 3px solid ${labelColor};">
                  <img src="${champIcon}" alt="${p.championName}" width="32" height="32"><br>
                  <strong>${p.riotId}</strong><br>
                  ${p.championName}<br>
                  <span>KDA: ${p.kills}/${p.deaths}/${p.assists}</span><br>
                  <span>CS: ${p.totalMinionsKilled ?? 0}</span><br>
                  <span>Vision: ${p.visionScore ?? 0}</span>
                  ${renderItemIcons(p.items, p.trinket, version)}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    };

    const matchList = matches.map((match, i) => {
      const readableMode =
        match.queueId === 420 ? 'Ranked Solo/Duo' :
        match.queueId === 440 ? 'Ranked Flex' :
        match.queueId === 400 ? 'Draft Pick' :
        match.queueId === 450 ? 'ARAM' :
        match.queueId === 480 || match.gameMode === 'SWIFTPLAY' ? 'Swiftplay' :
        match.queueId === 1700 || match.gameMode === 'CHERRY' ? 'Arena' :
        match.gameMode || 'Other';
      return `
        <div class="match-block">
          <div class="match-header">
            <span><strong>Game ${i + 1}</strong> (${readableMode})</span>
            <span><strong>Duration:</strong> ${match.gameDuration ? (match.gameDuration / 60).toFixed(1) : 'N/A'} min</span>
          </div>
          ${readableMode === 'Arena'
            ? '<div>Arena rendering not implemented</div>'
            : renderTeam(match.players.slice(0, 5), 'blue', latestVersion) +
              renderTeam(match.players.slice(5, 10), 'red', latestVersion)}
        </div>
      `;
    }).join('');

    output.innerHTML += `
      <h4 style="margin-top: 20px; color: #00c6ff;">Last 2 ${mode === 'all' ? 'All Modes' : 'Selected'} Games:</h4>
      ${matchList}
    `;
  } catch (err) {
    output.innerHTML = `<p style="color: #ff4c4c;">Error: ${err.message}</p>`;
  } finally {
    loading.style.display = 'none';
  }
}

function saveRecentSearch(nameTag) {
  let recent = JSON.parse(localStorage.getItem('recentSearches')) || [];
  recent = recent.filter(entry => entry !== nameTag);
  recent.unshift(nameTag);
  if (recent.length > 5) recent = recent.slice(0, 5);
  localStorage.setItem('recentSearches', JSON.stringify(recent));
  renderRecentSearches();
}

function renderRecentSearches() {
  const container = document.getElementById('recent-searches');
  if (!container) return;
  const recent = JSON.parse(localStorage.getItem('recentSearches')) || [];
  container.innerHTML = `<h3>Recent Searches:</h3>` + recent.map(rid => `
    <div class="search-result" onclick="loadFromRecent('${rid}')">${rid}</div>
  `).join('');
}

function loadFromRecent(riotId) {
  const input = document.getElementById('riotId');
  if (!input) return;
  input.value = riotId;
  getSummonerInfo();
}

window.loadFromRecent = loadFromRecent;
