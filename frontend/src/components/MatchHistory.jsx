import React, { useState, useEffect } from "react";
import { fetchDDragon } from "../utils/fetchDDragon";
import ItemTooltip from "./ItemTooltip";
import { ChevronDown } from "lucide-react";

export default function MatchHistory({ matches, champIdToName, champNameToId, itemsData, version, puuid, onPlayerClick }) {
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [latestVersion, setLatestVersion] = useState(version);
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [filterChampion, setFilterChampion] = useState("all");
  const [filterQueue, setFilterQueue] = useState("all");
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [runesData, setRunesData] = useState(null);
  const [augmentsData, setAugmentsData] = useState(null);
  const [spellIdToData, setSpellIdToData] = useState(null);

  useEffect(() => {
    fetchDDragon()
      .then((data) => {
        if (!version) setLatestVersion(data.latestVersion);
        setRunesData(data.runesData);
        setAugmentsData(data.augmentsData);
        setSpellIdToData(data.spellIdToData);
      })
      .catch((error) => console.error("Failed to fetch DDragon data:", error));
  }, [version]);

  const currentVersion = version || latestVersion;
  const toggleMatch = (index) => setExpandedMatch(expandedMatch === index ? null : index);

  const handlePlayerClick = (playerRiotId, event) => {
    event.stopPropagation();
    if (onPlayerClick) onPlayerClick(playerRiotId);
  };

  const formatChampionName = (championName) => {

    return championName
      .split('')
      .map((letter, index) => {
        if (letter === letter.toUpperCase() && index > 0) {
          return ' ' + letter;
        }
        return letter;
      })
      .join('');
  };


  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Recently";

    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) {
      return days === 1 ? "1 day ago" : `${days} days ago`;
    } else if (hours > 0) {
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    } else if (minutes > 0) {
      return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
    } else {
      return "Just now";
    }
  };

  const calculateKDA = (kills, deaths, assists) => {
    if (deaths === 0) return (kills + assists).toFixed(2);
    return ((kills + assists) / deaths).toFixed(2);
  };

  const getSummonerSpellPath = (spellId) => {
    const spellMap = {
      1: "Cleanse", 3: "Exhaust", 4: "Flash", 6: "Ghost",
      7: "Heal", 11: "Smite", 12: "Teleport", 13: "Clarity",
      14: "Ignite", 21: "Barrier", 32: "Mark", 39: "Mark",
      2201: "Flee", 2202: "Flash", // Arena specific IDs often fluctuate or use these
      // fallback for snowball if needed:
    };
    const spellName = spellMap[spellId];
    if (!spellName) {
      // console.log(`Unknown summoner spell ID: ${spellId}`);
      // return '/summoner-spells/unknown.png'; 
      // Better to return a path we can catch with onError or just unknown
      return '/summoner-spells/unknown.png';
    }
    return `/summoner-spells/${spellName}.png`;
  };

  const fixStatPerks = (statPerks) => {
    if (!statPerks) return null;
    const { defense, flex, offense } = statPerks;
    const validOffense = [5008, 5005, 5007];
    const validFlex = [5008, 5010, 5001];
    const validDefense = [5011, 5013, 5001];
    let fixedOffense = offense, fixedFlex = flex, fixedDefense = defense;
    if (!validOffense.includes(offense)) fixedOffense = 5008;
    if (!validFlex.includes(flex)) fixedFlex = 5008;
    if (!validDefense.includes(defense)) fixedDefense = 5011;
    if (fixedOffense !== offense || fixedFlex !== flex || fixedDefense !== defense) {
      return { offense: fixedOffense, flex: fixedFlex, defense: fixedDefense };
    }
    return statPerks;
  };

  const getRuneIconPath = (perkId) => {
    const runeMap = {

      8100: 'Domination/7200_Domination', 8112: 'Domination/Electrocute',
      8128: 'Domination/DarkHarvest', 9923: 'Domination/HailOfBlades',
      8126: 'Domination/CheapShot', 8139: 'Domination/GreenTerror_TasteOfBlood',
      8143: 'Domination/SuddenImpact', 8137: 'Domination/SixthSense',
      8140: 'Domination/GrislyMementos', 8141: 'Domination/DeepWard',
      8135: 'Domination/TreasureHunter', 8105: 'Domination/RelentlessHunter',
      8106: 'Domination/UltimateHunter',

      8000: 'Precision/7201_Precision', 8005: 'Precision/PressTheAttack',
      8008: 'Precision/LethalTempoTemp', 8021: 'Precision/FleetFootwork',
      8010: 'Precision/Conqueror', 9101: 'Precision/AbsorbLife', 9111: 'Precision/Triumph',
      8009: 'Precision/PresenceOfMind', 9104: 'Precision/LegendAlacrity',
      9105: 'Precision/LegendHaste', 9103: 'Precision/LegendBloodline',
      8014: 'Precision/CoupDeGrace', 8017: 'Precision/CutDown', 8299: 'Precision/LastStand',

      8200: 'Sorcery/7202_Sorcery', 8214: 'Sorcery/SummonAery', 8229: 'Sorcery/ArcaneComet',
      8230: 'Sorcery/PhaseRush', 8224: 'Sorcery/Axiom_Arcanist', 8226: 'Sorcery/ManaflowBand',
      8275: 'Sorcery/NimbusCloak', 8210: 'Sorcery/Transcendence', 8234: 'Sorcery/CelerityTemp',
      8233: 'Sorcery/AbsoluteFocus', 8237: 'Sorcery/Scorch', 8232: 'Sorcery/Waterwalking',
      8236: 'Sorcery/GatheringStorm',

      8400: 'Resolve/7204_Resolve', 8437: 'Resolve/GraspOfTheUndying',
      8439: 'Resolve/VeteranAftershock', 8465: 'Resolve/Guardian',
      8446: 'Resolve/Demolish', 8463: 'Resolve/FontOfLife', 8401: 'Resolve/BonePlating',
      8429: 'Resolve/Conditioning', 8444: 'Resolve/SecondWind', 8473: 'Resolve/BonePlating',
      8451: 'Resolve/Overgrowth', 8453: 'Resolve/Revitalize', 8242: 'Resolve/Unflinching',

      8300: 'Inspiration/7203_Whimsy', 8351: 'Inspiration/GlacialAugment',
      8360: 'Inspiration/UnsealedSpellbook', 8369: 'Inspiration/FirstStrike',
      8306: 'Inspiration/HextechFlashtraption', 8304: 'Inspiration/MagicalFootwear',
      8321: 'Inspiration/CashBack2', 8313: 'Inspiration/PerfectTiming',
      8352: 'Inspiration/TimeWarpTonic', 8345: 'Inspiration/BiscuitDelivery',
      8347: 'Inspiration/CosmicInsight', 8410: 'Inspiration/ApproachVelocity',
      8316: 'Inspiration/JackofAllTrades2',

      5001: 'stat-modifiers/StatModsHealthScalingIcon', 5005: 'stat-modifiers/StatModsAttackSpeedIcon',
      5007: 'stat-modifiers/StatModsCDRScalingIcon', 5008: 'stat-modifiers/StatModsAdaptiveForceIcon',
      5010: 'stat-modifiers/StatModsMovementSpeedIcon', 5011: 'stat-modifiers/StatModsHealthPlusIcon',
      5013: 'stat-modifiers/StatModsTenacityIcon',
    };
    return runeMap[perkId] ? `/runes/${runeMap[perkId]}.png` : '/runes/unknown.png';
  };


  const getAugmentIconPath = (iconPath) => {
    if (!iconPath) return "/runes/unknown.png";
    return `https://raw.communitydragon.org/latest/game/${iconPath.toLowerCase()}`;
  };

  const renderPlayerAugments = (player) => {
    // Arena augments seem to be in playerAugment1-4. 
    // Sometimes 0 is used for empty slots.
    const augments = [player.playerAugment1, player.playerAugment2, player.playerAugment3, player.playerAugment4].filter(id => id && id > 0);
    return (
      <div className="runes-container">
        <div className="augments-list" style={{ display: 'flex', gap: '4px' }}>
          {augments.map((augId, i) => {
            const augment = augmentsData?.[augId];
            return (
              <img
                key={i}
                src={augment ? getAugmentIconPath(augment.icon) : "/runes/unknown.png"}
                className="rune-icon augment-icon"
                onMouseEnter={(e) => {
                  if (augment) {
                    setHoveredItem(augment);
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={handleItemLeave}
                onError={(e) => (e.target.src = "/runes/unknown.png")}
              />
            );
          })}
        </div>
      </div>
    );
  };


  const renderPlayerRunes = (player, key) => {
    if (!player.perks || !player.perks.styles) return null;
    const primary = player.perks.styles[0];
    const secondary = player.perks.styles[1];
    const fixed = fixStatPerks(player.perks.statPerks);
    const hovered = hoveredPlayer === key;
    return (
      <div className="runes-container">
        {!hovered ? (
          <div className="runes-compact">
            {primary?.selections?.[0] && (
              <img
                src={getRuneIconPath(primary.selections[0].perk)}
                alt="Keystone"
                className="rune-icon keystone"
                onMouseEnter={() => setHoveredPlayer(key)}
                onError={(e) => (e.target.src = "/runes/unknown.png")}
              />
            )}
          </div>
        ) : (
          <div className="runes-full" onMouseLeave={() => { setHoveredPlayer(null); handleItemLeave(); }}>
            {primary && (
              <>
                <img src={getRuneIconPath(primary.style)} alt="Primary Style" className="rune-style-icon" />
                <div className="primary-runes">
                  {primary.selections?.map((s, i) => (
                    <img
                      key={i}
                      src={getRuneIconPath(s.perk)}
                      className={`rune-icon ${i === 0 ? "keystone" : "primary-rune"}`}
                      onMouseEnter={(e) => {
                        if (runesData && runesData[s.perk]) {
                          setHoveredItem(runesData[s.perk]);
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={handleItemLeave}
                      onError={(e) => (e.target.src = "/runes/unknown.png")}
                    />
                  ))}
                </div>
              </>
            )}
            {secondary && (
              <>
                <img src={getRuneIconPath(secondary.style)} alt="Secondary Style" className="rune-style-icon" />
                <div className="secondary-runes">
                  {secondary.selections?.map((s, i) => (
                    <img
                      key={i}
                      src={getRuneIconPath(s.perk)}
                      className="rune-icon secondary-rune"
                      onMouseEnter={(e) => {
                        if (runesData && runesData[s.perk]) {
                          setHoveredItem(runesData[s.perk]);
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={handleItemLeave}
                      onError={(e) => (e.target.src = "/runes/unknown.png")}
                    />
                  ))}
                </div>
              </>
            )}
            {fixed && (
              <div className="stat-shards">
                <img src={getRuneIconPath(fixed.offense)} className="stat-shard" />
                <img src={getRuneIconPath(fixed.flex)} className="stat-shard" />
                <img src={getRuneIconPath(fixed.defense)} className="stat-shard" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderObjectives = (teamObjectives) => {
    if (!teamObjectives) return null;
    return (
      <div className="flex flex-wrap gap-3">
        {Object.entries(teamObjectives).map(([key, val]) =>
          val > 0 && (
            <div key={key} className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{key}:</span>
              <span className="text-[10px] font-black text-foreground">{val}</span>
            </div>
          )
        )}
      </div>
    );
  };

  const handleItemEnter = (id, event) => {
    const item = itemsData?.[id];
    if (item) {
      setHoveredItem(item);
      setTooltipPos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleItemMove = (event) => {
    if (hoveredItem) {
      setTooltipPos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleItemLeave = () => {
    setHoveredItem(null);
  };

  const renderPlayerRow = (p, isCurrent, queueId) => {
    const key = `${p.puuid}-${p.championName}`;
    const normalItems = p.items.slice(0, 6).filter((id) => id > 0);
    const itemsOrdered = [...normalItems, ...Array(6 - normalItems.length).fill(0)];

    return (
      <div className={`flex items-center gap-3 p-2 rounded-xl border border-white/5 transition-colors ${isCurrent ? "bg-primary/10 border-primary/20" : "hover:bg-white/5"}`} key={p.puuid}>
        <div className="relative flex-shrink-0">
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/champion/${champIdToName?.[p.championId] || p.championName}.png`}
            className="w-10 h-10 rounded-lg border border-white/10 shadow-lg"
            onError={(e) => (e.target.src = "/placeholder-champ.png")}
          />
          <div className="absolute -bottom-1 -right-1 bg-black border border-white/20 text-[8px] font-black px-1 rounded-sm text-foreground/80">
            {p.champLevel}
          </div>
        </div>

        <div className="flex flex-col gap-0.5 min-w-[30px]">
          <img src={getSummonerSpellPath(p.summoner1Id)} className="w-4 h-4 rounded-md brightness-110" onMouseEnter={(e) => handleItemEnter(p.summoner1Id, e)} onMouseLeave={handleItemLeave} />
          <img src={getSummonerSpellPath(p.summoner2Id)} className="w-4 h-4 rounded-md brightness-110" onMouseEnter={(e) => handleItemEnter(p.summoner2Id, e)} onMouseLeave={handleItemLeave} />
        </div>

        <div className="flex-1 min-w-0">
          <div className={`text-[11px] font-black truncate tracking-tight transition-colors ${!isCurrent ? "text-muted-foreground group-hover/row:text-foreground cursor-pointer" : "text-primary"}`} onClick={!isCurrent ? (e) => handlePlayerClick(p.riotId, e) : undefined}>
            {p.riotId}
          </div>
          <div className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none">
            {p.kills}/{p.deaths}/{p.assists}
          </div>
        </div>

        <div className="flex gap-1">
          {itemsOrdered.map((id, i) => (
            id > 0 ? (
              <img
                key={i}
                src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/item/${id}.png`}
                className="w-6 h-6 rounded-md border border-white/5"
                onMouseEnter={(e) => handleItemEnter(id, e)}
                onMouseMove={handleItemMove}
                onMouseLeave={handleItemLeave}
              />
            ) : (
              <div key={i} className="w-6 h-6 bg-white/5 rounded-md border border-white/5" />
            )
          ))}
        </div>
      </div>
    );
  };

  const getGameMode = (queueId) => {
    const modes = { 420: "Solo/Duo", 440: "Flex", 400: "Draft", 450: "ARAM", 480: "Swiftplay", 900: "URF", 1700: "Arena", 2400: "Aram Mayhem" };
    return modes[queueId] || "Normal";
  };

  const renderArenaMatchDetails = (match) => {
    const teamsByPlacement = {};
    match.players.forEach((p) => {
      const placement = p.placement || p.subteamPlacement || 0;
      if (!teamsByPlacement[placement]) teamsByPlacement[placement] = [];
      teamsByPlacement[placement].push(p);
    });

    const sortedPlacements = Object.keys(teamsByPlacement).sort((a, b) => Number(a) - Number(b));

    const renderArenaTeamCard = (placement, players) => {
      const num = Number(placement);
      const isTopPlace = num <= 2;
      const suffix = num === 1 ? "st" : num === 2 ? "nd" : num === 3 ? "rd" : "th";

      return (
        <div key={placement} className={`glass-panel p-4 rounded-2xl border transition-all ${isTopPlace ? "border-primary/30 bg-primary/5" : "border-white/5 bg-white/5"}`}>
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isTopPlace ? "text-primary" : "text-muted-foreground"}`}>
              {num}{suffix} PLACE
            </span>
          </div>
          <div className="space-y-2">
            {players.map((p) => renderPlayerRow(p, p.puuid === puuid, 1700))}
          </div>
        </div>
      );
    };

    return (
      <div className="grid md:grid-cols-2 gap-4">
        {sortedPlacements.map(placement => renderArenaTeamCard(placement, teamsByPlacement[placement]))}
      </div>
    );
  };

  const renderMatch = (match, i) => {
    const player = match.players.find((p) => p.puuid === puuid);
    if (!player) return null;
    const blue = match.players.filter((p) => p.teamId === 100);
    const red = match.players.filter((p) => p.teamId === 200);
    const expanded = expandedMatch === i;
    const playerItems = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5, player.item6].filter(id => id > 0);
    const kdaRatio = calculateKDA(player.kills, player.deaths, player.assists);
    const timeAgo = getTimeAgo(match.gameEndTimestamp || match.gameStartTimestamp);
    const isArena = match.queueId === 1700;
    const isWin = player.win;

    return (
      <div key={i} className={`group/match relative overflow-hidden rounded-3xl transition-all duration-500 border hover:shadow-2xl mb-4 ${isWin ? "border-green-500/30 bg-green-500/5 shadow-green-500/5 hover:border-green-500/50" : "border-red-500/30 bg-red-500/5 shadow-red-500/5 hover:border-red-500/50"}`}>
        <div className="match-header p-5 cursor-pointer select-none" onClick={() => toggleMatch(i)}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Visual Indicator */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isWin ? "bg-green-500" : "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"}`} />

            {/* Left: Champion & Result */}
            <div className="flex items-center gap-4 min-w-[180px]">
              <div className="relative">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/champion/${champIdToName?.[player.championId] || player.championName}.png`}
                  className={`w-16 h-16 rounded-2xl border-2 shadow-lg group-hover/match:scale-105 transition-transform duration-500 ${isWin ? "border-green-500/50" : "border-red-500/50"}`}
                  onError={(e) => (e.target.src = "/placeholder-champ.png")}
                />
                <div className="absolute -bottom-2 -right-2 bg-background border border-border px-2 py-0.5 rounded-lg text-[9px] font-black italic tracking-widest text-foreground shadow-xl">
                  {player.champLevel}
                </div>
              </div>
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.2em] mb-0.5 ${isWin ? "text-green-400" : "text-red-400"}`}>
                  {isArena ? `POS ${player.placement}` : (isWin ? "Victory" : "Defeat")}
                </div>
                <div className="font-display text-lg font-black text-foreground leading-none">{formatChampionName(player.championName)}</div>
                <div className="text-[10px] text-muted-foreground/60 font-bold mt-1 uppercase tracking-widest leading-none">{timeAgo}</div>
              </div>
            </div>

            {/* Middle: Stats */}
            <div className="flex flex-1 items-center justify-around gap-4">
              <div className="text-center">
                <div className="font-display text-2xl font-black text-foreground tracking-tight leading-none mb-1">
                  {player.kills} <span className="opacity-20 text-sm">/</span> <span className="text-red-400">{player.deaths}</span> <span className="opacity-20 text-sm">/</span> {player.assists}
                </div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{kdaRatio} KDA</div>
              </div>

              <div className="hidden lg:flex flex-col items-center gap-1">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{getGameMode(match.queueId)}</div>
                <div className="text-sm font-bold opacity-60 italic tabular-nums">
                  {Math.floor(match.gameDuration / 60)}:{(match.gameDuration % 60).toString().padStart(2, "0")}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 max-w-[160px] justify-center">
                {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
                  const itemId = player[`item${idx}`];
                  return itemId > 0 ? (
                    <img
                      key={idx}
                      src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/item/${itemId}.png`}
                      className="w-8 h-8 rounded-lg border border-white/5 hover:scale-110 transition-transform cursor-help"
                      onMouseEnter={(e) => handleItemEnter(itemId, e)}
                      onMouseMove={handleItemMove}
                      onMouseLeave={handleItemLeave}
                    />
                  ) : (
                    <div key={idx} className="w-8 h-8 rounded-lg bg-black/20 border border-white/5" />
                  );
                })}
              </div>
            </div>

            {/* Right: Toggle Button */}
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${isWin ? "bg-green-500/20 border-green-500/20 text-green-400" : "bg-red-500/20 border-red-500/20 text-red-400"}`}>
              <span className={`text-lg font-black transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>▼</span>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="px-5 pb-5 border-t border-white/5 pt-5 animate-in slide-in-from-top-4 duration-300">
            {isArena ? renderArenaMatchDetails(match) : (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Blue Team</h5>
                  </div>
                  <div className="space-y-2">
                    {blue.map((p) => renderPlayerRow(p, p.puuid === puuid, match.queueId))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <h5 className="text-[10px] font-black text-red-400 uppercase tracking-widest">Red Team</h5>
                  </div>
                  <div className="space-y-2">
                    {red.map((p) => renderPlayerRow(p, p.puuid === puuid, match.queueId))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const playedChampions = Array.from(new Set(matches.map(m => {
    const p = m.players.find(p => p.puuid === puuid);
    return p ? p.championName : null;
  }))).filter(Boolean).sort();

  const filteredMatches = matches.filter(match => {
    const player = match.players.find(p => p.puuid === puuid);
    if (!player) return false;

    const champMatch = filterChampion === "all" || player.championName === filterChampion;
    const queueMatch = filterQueue === "all" || match.queueId.toString() === filterQueue;

    return champMatch && queueMatch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6 bg-secondary/30 p-5 rounded-2xl border border-white/10 mb-8 backdrop-blur-md">
        <div className="flex flex-col gap-2 min-w-[200px]">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Champion</label>
          <div className="relative group/select">
            <input
              type="text"
              className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
              placeholder="Search champion..."
              value={isDropdownOpen ? searchQuery : (filterChampion === "all" ? "All Champions" : formatChampionName(filterChampion))}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFilterChampion("all");
                setIsDropdownOpen(true);
              }}
              onClick={() => {
                setIsDropdownOpen(true);
                setSearchQuery("");
              }}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            />
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-secondary border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div
                  className="px-4 py-3 hover:bg-white/5 cursor-pointer text-sm font-bold border-b border-white/5"
                  onClick={() => {
                    setFilterChampion("all");
                    setIsDropdownOpen(false);
                    setSearchQuery("");
                  }}
                >
                  All Champions
                </div>
                {playedChampions
                  .filter(champ => champ.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(champ => (
                    <div
                      key={champ}
                      className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0"
                      onClick={() => {
                        setFilterChampion(champ);
                        setIsDropdownOpen(false);
                        setSearchQuery(formatChampionName(champ));
                      }}
                    >
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/champion/${champIdToName?.[champNameToId?.[champ]] || champ}.png`}
                        alt={champ}
                        className="w-6 h-6 rounded-md"
                        onError={(e) => (e.target.src = "/placeholder-champ.png")}
                      />
                      <span className="text-sm font-bold">{formatChampionName(champ)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-[180px]">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Queue</label>
          <div className="relative group/select">
            <select
              value={filterQueue}
              onChange={(e) => setFilterQueue(e.target.value)}
              className="w-full bg-background/50 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold text-foreground focus:border-primary/50 outline-none appearance-none cursor-pointer transition-all"
            >
              <option value="all" className="bg-neutral-900">All Queues</option>
              <option value="420" className="bg-neutral-900">Solo/Duo</option>
              <option value="440" className="bg-neutral-900">Flex</option>
              <option value="450" className="bg-neutral-900">ARAM</option>
              <option value="2400" className="bg-neutral-900">Aram Mayhem</option>
              <option value="900" className="bg-neutral-900">URF</option>
              <option value="480" className="bg-neutral-900">Swiftplay</option>
              <option value="400" className="bg-neutral-900">Draft</option>
              <option value="1700" className="bg-neutral-900">Arena</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/30 group-hover/select:text-primary transition-colors">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {
        filteredMatches.length > 0 ? (
          filteredMatches.map((m, i) => renderMatch(m, i))
        ) : (
          <p className="text-center unranked">No matches found matching filters</p>
        )
      }

      {hoveredItem && <ItemTooltip item={hoveredItem} position={tooltipPos} version={currentVersion} />}
    </div >
  );
}