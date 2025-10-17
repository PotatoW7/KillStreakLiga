import { profileIconUrl } from './ddragon.js';

document.getElementById('searchBtn').addEventListener('click', async () => {
  const riotId = document.getElementById('riotId').value.trim();
  const region = document.getElementById('region').value;
  const output = document.getElementById('output');
  const loading = document.getElementById('loading');
  const recentSearches = document.getElementById('recent-searches');

  output.innerHTML = '';
  loading.style.display = 'block';

  try {
    if (!riotId.includes('#')) throw new Error('Riot ID must include #TAG (e.g. ZenMasterNEED#EUW)');

    const [gameName, tagLine] = riotId.split('#');
    const url = `/summoner-info/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const summonerRes = await fetch(url);

    if (!summonerRes.ok) {
      const errorData = await summonerRes.json();
      throw new Error(errorData.error || 'Failed to fetch summoner info');
    }

    const summonerData = await summonerRes.json();
    if (!summonerData.profileIconId) throw new Error('Missing profile icon ID');

    const entry = document.createElement('div');
    entry.textContent = summonerData.name;
    recentSearches.prepend(entry);

    const iconUrl = await profileIconUrl(summonerData.profileIconId);
    const fallbackUrl = profileIconUrl(0); // always works

    const img = new Image();
    img.src = iconUrl;
    img.height = 64;
    img.onerror = () => {
      console.warn(`Icon ${summonerData.profileIconId} failed, using fallback`);
      img.src = fallbackUrl;
    };

    output.innerHTML += `
      <p><strong>${summonerData.name}</strong></p>
      <p>Level: ${summonerData.summonerLevel}</p>
      <h3>Ranked Stats</h3>
    `;
    output.appendChild(img);

    const solo = summonerData.ranked.find(q => q.queueType === 'RANKED_SOLO_5x5');
    const flex = summonerData.ranked.find(q => q.queueType === 'RANKED_FLEX_SR');

    if (solo) {
      const totalGames = solo.wins + solo.losses;
      const winrate = totalGames > 0 ? Math.round((solo.wins / totalGames) * 100) : 0;
      output.innerHTML += `
        <p><strong>Ranked Solo/Duo</strong>: ${solo.tier} ${solo.rank} - ${solo.leaguePoints} LP</p>
        <p>${solo.wins}W / ${solo.losses}L (${winrate}% WR)</p>
      `;
    } else {
      output.innerHTML += `<p><strong>Ranked Solo/Duo</strong>: Unranked</p>`;
    }

    if (flex) {
      const totalGames = flex.wins + flex.losses;
      const winrate = totalGames > 0 ? Math.round((flex.wins / totalGames) * 100) : 0;
      output.innerHTML += `
        <p><strong>Ranked Flex</strong>: ${flex.tier} ${flex.rank} - ${flex.leaguePoints} LP</p>
        <p>${flex.wins}W / ${flex.losses}L (${winrate}% WR)</p>
      `;
    } else {
      output.innerHTML += `<p><strong>Ranked Flex</strong>: Unranked</p>`;
    }

  } catch (err) {
    output.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  } finally {
    loading.style.display = 'none';
  }
});
