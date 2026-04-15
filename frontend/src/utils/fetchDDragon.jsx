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

      const runeRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/runesReforged.json`);
      const runeData = await runeRes.json();

      let augmentsData = {};
      try {
        const augmentRes = await fetch("https://raw.communitydragon.org/latest/cdragon/arena/en_us.json");
        if (augmentRes.ok) {
          const augmentJson = await augmentRes.json();
          if (augmentJson.augments) {
            augmentJson.augments.forEach(aug => {
              augmentsData[aug.id] = {
                name: aug.name,
                description: aug.desc,
                icon: aug.iconLarge,
                // Store dataValues for parsing later if needed, or parse description here if possible. 
                // But MatchHistory will handle parsing to keep this clean or we can do it here. 
                // Let's pass the raw dataValues too.
                dataValues: aug.dataValues
              };
            });
          }
        }
      } catch (e) {
        console.warn("Failed to fetch Arena augments", e);
      }

      const runesData = {};
      runeData.forEach(tree => {
        // Process the tree itself (Domination, Precision, etc.) - usually not needed for individual rune tooltips but good to have context if needed
        // Iterate slots/runes
        tree.slots.forEach(slot => {
          slot.runes.forEach(rune => {
            runesData[rune.id] = {
              name: rune.name,
              description: rune.shortDesc || rune.longDesc,
              icon: rune.icon,
              type: 'rune'
            };
          });
        });
      });

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


      const spellIdToData = {};
      Object.values(spellData.data).forEach(spell => {
        spellIdToData[spell.key] = {
          ...spell,
          type: 'summoner'
        };
        const normalized = normalize(spell.name);
        iconMap[normalized] = {
          name: spell.name,
          url: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/spell/${spell.image.full}`,
          type: 'spell'
        };
      });

      return { latestVersion, iconMap, champIdToName, champNameToId, itemsData: itemData.data, runesData, spellIdToData, augmentsData };
    } catch (error) {
      console.error("Error in fetchDDragon:", error);
      ddragonCache = null;
      throw error;
    }
  })();

  return ddragonCache;
}
