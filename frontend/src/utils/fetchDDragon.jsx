export async function fetchDDragon() {
  const versionRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
  const versions = await versionRes.json();
  const latestVersion = versions[0];

  const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
  const champData = await champRes.json();

  const champIdToName = {};
  const champNameToId = {};
  Object.values(champData.data).forEach(champ => {
    const id = parseInt(champ.key);
    champIdToName[id] = champ.id;
    champNameToId[champ.id] = id;
  });

  return { latestVersion, champIdToName, champNameToId };
}
