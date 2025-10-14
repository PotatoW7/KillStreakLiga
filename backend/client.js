document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchBtn').addEventListener('click', getSummonerInfo);
  renderRecentSearches();
});

function getSummonerInfo() {
  const riotId = document.getElementById('riotId').value.trim();
  const region = document.getElementById('region').value;
  const gameMode = document.getElementById('gameMode').value;
  const output = document.getElementById('output');
  const loading = document.getElementById('loading');

  const [gameName, tagLine] = riotId.split('#');
  if (!gameName || !tagLine || !region) {
    output.textContent = 'Please enter Riot ID in format: Name#Tag and select a region.';
    return;
  }

  saveRecentSearch(riotId);
  renderRecentSearches();

  output.innerHTML = '';
  loading.style.display = 'block';

  fetch('https://ddragon.leagueoflegends.com/api/versions.json')
    .then(res => res.json())
    .then(versions => {
      const latestVersion = versions[0];
      const url = `/summoner-info/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error('Summoner not found or API error.');
          return response.json();
        })
        .then(data => {
          fetch(`/match-history/${region}/${data.puuid}?count=100&queueId=all`)
            .then(res => res.json())
            .then(matchData => {
              const matches = matchData.matches || [];

              let filteredMatches = matches;
              if (gameMode === '400') {
                filteredMatches = matches.filter(m => m.info.queueId === 400 && m.info.gameMode !== 'SWIFTPLAY');
              } else if (gameMode === 'swiftplay') {
                filteredMatches = matches.filter(m => m.info.gameMode === 'SWIFTPLAY');
              } else if (gameMode !== 'all') {
                filteredMatches = matches.filter(m => m.info.queueId.toString() === gameMode);
              }

              let totalGames = 0;
              let winrate = 0;

              const rankedSolo = data.ranked?.find(entry => entry.queueType === 'RANKED_SOLO_5x5');
              const rankedFlex = data.ranked?.find(entry => entry.queueType === 'RANKED_FLEX_SR');

              if (gameMode === '420' && rankedSolo) {
                totalGames = rankedSolo.wins + rankedSolo.losses;
                winrate = ((rankedSolo.wins / totalGames) * 100).toFixed(1);
              } else if (gameMode === '440' && rankedFlex) {
                totalGames = rankedFlex.wins + rankedFlex.losses;
                winrate = ((rankedFlex.wins / totalGames) * 100).toFixed(1);
              } else {
                const playerStats = filteredMatches.map(m => {
                  const p = m.info.participants.find(p => p.puuid === data.puuid);
                  return p ? { win: p.win } : null;
                }).filter(Boolean);

                totalGames = playerStats.length;
                const wins = playerStats.filter(p => p.win).length;
                winrate = totalGames ? ((wins / totalGames) * 100).toFixed(1) : 0;
              }

              const soloInfo = rankedSolo
                ? `<strong>Solo/Duo:</strong><br>${rankedSolo.tier} ${rankedSolo.rank} (${rankedSolo.leaguePoints} LP)<br>
                   Games Played: ${rankedSolo.wins + rankedSolo.losses}<br>
                   Wins: ${rankedSolo.wins} | Losses: ${rankedSolo.losses}<br>
                   Winrate: ${((rankedSolo.wins / (rankedSolo.wins + rankedSolo.losses)) * 100).toFixed(1)}%`
                : '<strong>Solo/Duo:</strong> Not available';

              const flexInfo = rankedFlex
                ? `<strong>Flex:</strong><br>${rankedFlex.tier} ${rankedFlex.rank} (${rankedFlex.leaguePoints} LP)<br>
                   Games Played: ${rankedFlex.wins + rankedFlex.losses}<br>
                   Wins: ${rankedFlex.wins} | Losses: ${rankedFlex.losses}<br>
                   Winrate: ${((rankedFlex.wins / (rankedFlex.wins + rankedFlex.losses)) * 100).toFixed(1)}%`
                : '<strong>Flex:</strong> Not available';

              output.innerHTML = `
                <div class="summoner-card">
                  <img src="https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/${data.profileIconId}.png" 
                       alt="Summoner Icon" class="summoner-icon">
                  <div class="summoner-info">
                    <h3>${data.name}</h3>
                    <p>Level ${data.summonerLevel}</p>
                    <div class="rank-block">${soloInfo}</div>
                    <div class="rank-block">${flexInfo}</div>
                  </div>
                  <div class="stat-circles">
                    <div class="circle played">
                      <div class="circle-value">${totalGames}</div>
                      <div class="circle-label">Played</div>
                    </div>
                    <div class="circle winrate">
                      <div class="circle-value">${winrate}%</div>
                      <div class="circle-label">Winrate</div>
                    </div>
                  </div>
                </div>
              `;

              const matchList = filteredMatches.slice(0, 2).map(match => {
                const info = match.info;
                const readableMode = info.queueId === 420 ? 'Ranked Solo/Duo'
                                  : info.queueId === 440 ? 'Ranked Flex'
                                  : info.queueId === 400 ? 'Draft Pick'
                                  : info.queueId === 450 ? 'ARAM'
                                  : info.gameMode === 'SWIFTPLAY' ? 'Swiftplay'
                                  : info.gameMode || 'Other';

                const team1 = info.participants.slice(0, 5);
                const team2 = info.participants.slice(5, 10);

                const renderTeam = (team, labelColor) => `
                  <div style="margin-top: 10px;">
                    <h4 style="color: ${labelColor}; margin-bottom: 6px;">${labelColor === '#00c6ff' ? 'Blue Side' : 'Red Side'}</h4>
                    <div class="team-grid">
                      ${team.map(p => {
                        const champIcon = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${p.championName}.png`;
                        const resultColor = p.win ? '#00c6ff' : '#ff4c4c';
                        return `
                          <div class="player-card" style="border-left: 3px solid ${resultColor};">
                            <img src="${champIcon}" alt="${p.championName}" width="32" height="32"><br>
                            <strong>${p.riotId}</strong><br>
                            ${p.championName}<br>
                            KDA: ${p.kills}/${p.deaths}/${p.assists}<br>
                            CS: ${p.totalMinionsKilled}<br>
                            Vision: ${p.visionScore}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;

                return `
                  <div class="match-block">
                    <div class="match-header">
                      <span><strong>Game Mode:</strong> ${readableMode}</span>
                      <span><strong>Duration:</strong> ${(info.gameDuration / 60).toFixed(1)} min</span>
                    </div>
                    ${renderTeam(team1, '#00c6ff')}
                    ${renderTeam(team2, '#ff4c4c')}
                  </div>
                `;
              }).join('');

              output.innerHTML += `
                <h4 style="margin-top: 20px; color: #00c6ff;">Last 2 Matches (${gameMode === 'all' ? 'All Modes' : document.getElementById('gameMode').selectedOptions[0].text}):</h4>
                ${matchList}
              `;

              loading.style.display = 'none';
            })
            .catch(err => {
              loading.style.display = 'none';
              output.innerHTML = `<p style="color: #ff4c4c;">Failed to load match history.</p>`;
              console.error('Match history error:', err);
            });
        })
        .catch(error => {
          loading.style.display = 'none';
          output.textContent = `Error: ${error.message}`;
        });
    })
    .catch(error => {
      loading.style.display = 'none';
      output.textContent = `Error fetching Data Dragon version: ${error.message}`;
    });
}

function saveRecentSearch(nameTag) {
  let recent = JSON.parse(localStorage.getItem('recentSearches')) || [];
  if (!recent.includes(nameTag)) {
        recent.unshift(nameTag);
    if (recent.length > 5) recent.pop();
    localStorage.setItem('recentSearches', JSON.stringify(recent));
  }
}

function renderRecentSearches() {
  const container = document.getElementById('recent-searches');
  if (!container) return;

  const recent = JSON.parse(localStorage.getItem('recentSearches')) || [];
  container.innerHTML = `<h4>Recent Searches:</h4>` + recent.map(rid => `
    <div class="search-result" onclick="loadFromRecent('${rid}')">${rid}</div>
  `).join('');
}

function loadFromRecent(riotId) {
  const input = document.getElementById('riotId');
  if (!input) return;
  input.value = riotId;
  getSummonerInfo();
}

