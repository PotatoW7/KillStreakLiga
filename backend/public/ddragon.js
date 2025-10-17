export async function profileIconUrl(id) {
  const versionRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  const versions = await versionRes.json();
  const latest = versions[0];
  return `https://ddragon.leagueoflegends.com/cdn/${latest}/img/profileicon/${id}.png`;
}
