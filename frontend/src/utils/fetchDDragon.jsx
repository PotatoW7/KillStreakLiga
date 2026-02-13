let ddragonCache = null;

export async function fetchDDragon() {
  if (ddragonCache) return ddragonCache;

  ddragonCache = (async () => {
    try {
      const versionRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      if (!versionRes.ok) throw new Error("Failed to fetch versions");
      const versions = await versionRes.json();
      const latestVersion = versions[0];

      // Fetch Champions
      const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
      const champData = await champRes.json();

      // Fetch Items
      const itemRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/item.json`);
      const itemData = await itemRes.json();

      // Fetch Summoner Spells
      const spellRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/summoner.json`);
      const spellData = await spellRes.json();

      const iconMap = {};

      // Helper to normalize names
      const normalize = (name) => name.toLowerCase().replace(/\s+/g, '_').replace(/['.]/g, '');

      // Process Champions
      Object.values(champData.data).forEach(champ => {
        const normalized = normalize(champ.name);
        iconMap[normalized] = {
          name: champ.name,
          url: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champ.id}.png`,
          type: 'champion'
        };
      });

      // Process Items
      Object.values(itemData.data).forEach(item => {
        const normalized = normalize(item.name);
        iconMap[normalized] = {
          name: item.name,
          url: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/item/${item.image.full}`,
          type: 'item'
        };
      });

      // Process Spells
      Object.values(spellData.data).forEach(spell => {
        const normalized = normalize(spell.name);
        iconMap[normalized] = {
          name: spell.name,
          url: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/spell/${spell.image.full}`,
          type: 'spell'
        };
      });

      return { latestVersion, iconMap };
    } catch (error) {
      console.error("Error in fetchDDragon:", error);
      ddragonCache = null; // Reset on error
      throw error;
    }
  })();

  return ddragonCache;
}
