let ddragonCache = null;

export async function fetchDDragon() {
  if (ddragonCache) return ddragonCache;

  ddragonCache = (async () => {
    try {
      const versionRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      if (!versionRes.ok) throw new Error("Failed to fetch versions");
      const versions = await versionRes.json();
      const latestVersion = versions[0];

      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
      const champData = await champRes.json();


      const itemRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/item.json`);
      const itemData = await itemRes.json();


      const spellRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/summoner.json`);
      const spellData = await spellRes.json();

      const iconMap = {};
      const champIdToName = {};
      const champNameToId = {};


      const normalize = (name) => name.toLowerCase().replace(/\s+/g, '_').replace(/['.]/g, '');

      Object.values(champData.data).forEach(champ => {
        const normalized = normalize(champ.name);
        champIdToName[champ.key] = champ.id;
        champNameToId[champ.id] = champ.key;
        iconMap[normalized] = {
          name: champ.name,
          url: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champ.id}.png`,
          type: 'champion'
        };
      });


      Object.values(itemData.data).forEach(item => {
        const normalized = normalize(item.name);
        iconMap[normalized] = {
          name: item.name,
          url: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/item/${item.image.full}`,
          type: 'item'
        };
      });


      Object.values(spellData.data).forEach(spell => {
        const normalized = normalize(spell.name);
        iconMap[normalized] = {
          name: spell.name,
          url: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/spell/${spell.image.full}`,
          type: 'spell'
        };
      });

      return { latestVersion, iconMap, champIdToName, champNameToId, itemsData: itemData.data };
    } catch (error) {
      console.error("Error in fetchDDragon:", error);
      ddragonCache = null;
      throw error;
    }
  })();

  return ddragonCache;
}
