export async function fetchDDragon() {
  try {
    const versionRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    if (!versionRes.ok) throw new Error("Failed to fetch versions");
    const versions = await versionRes.json();
    const latestVersion = versions[0];

    const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
    if (!champRes.ok) throw new Error("Failed to fetch champion data");
    const champData = await champRes.json();

    const champIdToName = {};
    const champNameToId = {};
    Object.values(champData.data).forEach(champ => {
      const id = parseInt(champ.key);
      champIdToName[id] = champ.id;
      champNameToId[champ.id] = id;
    });

    return { latestVersion, champIdToName, champNameToId };
  } catch (error) {
    console.error("Error in fetchDDragon:", error);
    throw error;
  }
}
