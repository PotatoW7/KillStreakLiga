import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDDragon } from "../utils/fetchDDragon";
import ItemTooltip from "./ItemTooltip";
import { ChevronDown, TrendingUp } from "lucide-react";

export default function MatchHistory({ matches, champIdToName, champNameToId, itemsData, version, puuid, region, onPlayerClick }) {
  const navigate = useNavigate();
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
    if (days > 0) return days === 1 ? "1 day ago" : `${days} days ago`;
    if (hours > 0) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    if (minutes > 0) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
    return "Just now";
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
      2201: "Flee", 2202: "Flash",
    };
    const spellName = spellMap[spellId];
    if (!spellName) return '/summoner-spells/unknown.png';
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
      <div className="mh-objectives">
        {Object.entries(teamObjectives).map(([key, val]) =>
          val > 0 && (
            <div key={key} className="mh-objective">
              <span className="mh-objective-label">{key}:</span>
              <span className="mh-objective-value">{val}</span>
            </div>
          )
        )}
      </div>
    );
  };

  const renderMiniParticipants = (players, matchQueueId) => {
    const blue = players.filter(p => p.teamId === 100);
    const red = players.filter(p => p.teamId === 200);

    const renderColumn = (teamPlayers, side) => (
      <div className={`mh-mini-team ${side}`}>
        {teamPlayers.map((p, idx) => (
          <div key={idx} className="mh-mini-player">
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/champion/${champIdToName?.[p.championId] || p.championName}.png`}
              className="mh-mini-champ-icon"
              onError={(e) => (e.target.src = "/placeholder-champ.png")}
            />
            <span 
              className={`mh-mini-riot-id ${p.puuid === puuid ? "current" : ""}`}
              onClick={(e) => handlePlayerClick(p.riotId, e)}
            >
              {p.riotId.split('#')[0]}
            </span>
          </div>
        ))}
      </div>
    );

    return (
      <div className="mh-participants-mini">
        {renderColumn(blue, "blue")}
        {renderColumn(red, "red")}
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

  const handleSpellEnter = (spellId, event) => {
    const spell = spellIdToData?.[spellId];
    if (spell) {
      setHoveredItem(spell);
      setTooltipPos({ x: event.clientX, y: event.clientY });
    }
  };

  const renderPlayerRow = (p, isCurrent, queueId) => {
    const key = `${p.puuid}-${p.championName}`;
    const normalItems = p.items.slice(0, 6).filter((id) => id > 0);
    const itemsOrdered = [...normalItems, ...Array(6 - normalItems.length).fill(0)];

    return (
      <div className={`mh-player-row ${isCurrent ? "current" : ""}`} key={p.puuid}>
        <div className="mh-player-champ-wrapper">
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/champion/${champIdToName?.[p.championId] || p.championName}.png`}
            className="mh-player-champ-icon"
            onError={(e) => (e.target.src = "/placeholder-champ.png")}
          />
        </div>

        <div className="mh-player-spells">
          <img src={getSummonerSpellPath(p.summoner1Id)} className="mh-spell-icon" onMouseEnter={(e) => handleSpellEnter(p.summoner1Id, e)} onMouseMove={handleItemMove} onMouseLeave={handleItemLeave} />
          <img src={getSummonerSpellPath(p.summoner2Id)} className="mh-spell-icon" onMouseEnter={(e) => handleSpellEnter(p.summoner2Id, e)} onMouseMove={handleItemMove} onMouseLeave={handleItemLeave} />
        </div>

        {queueId === 1700 ? renderPlayerAugments(p) : renderPlayerRunes(p, key)}

        <div className="mh-player-info">
          <div
            className={`mh-player-name ${isCurrent ? "current" : "other"}`}
            onClick={!isCurrent ? (e) => handlePlayerClick(p.riotId, e) : undefined}
          >
            {p.riotId}
          </div>
          <div className="mh-player-kda-text">
            {p.kills}/{p.deaths}/{p.assists}
          </div>
        </div>

        <div className="mh-player-items">
          {itemsOrdered.map((id, i) => (
            id > 0 ? (
              <img
                key={i}
                src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/item/${id}.png`}
                className="mh-player-item-icon"
                onMouseEnter={(e) => handleItemEnter(id, e)}
                onMouseMove={handleItemMove}
                onMouseLeave={handleItemLeave}
              />
            ) : (
              <div key={i} className="mh-player-item-empty" />
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
        <div key={placement} className={`mh-arena-card glass-panel ${isTopPlace ? "top" : ""}`}>
          <div className="mh-arena-header">
            <span className={`mh-arena-place ${isTopPlace ? "top" : ""}`}>
              {num}{suffix} PLACE
            </span>
          </div>
          <div className="mh-players">
            {players.map((p) => renderPlayerRow(p, p.puuid === puuid, 1700))}
          </div>
        </div>
      );
    };

    return (
      <div className="mh-arena-grid">
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
      <div key={i} className={`mh-card ${isWin ? "win" : "loss"}`}>
        <div className={`mh-indicator ${isWin ? "win" : "loss"}`} />
        <div className="mh-header" onClick={() => toggleMatch(i)}>
          <div className="mh-header-content">
            <div className="mh-champ-section">
              <div className="mh-champ-wrapper">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/champion/${champIdToName?.[player.championId] || player.championName}.png`}
                  className={`mh-champ-icon ${isWin ? "win" : "loss"}`}
                  onError={(e) => (e.target.src = "/placeholder-champ.png")}
                />
              </div>
              <div>
                <div className={`mh-result-text ${isWin ? "win" : "loss"}`}>
                  {isArena ? `POS ${player.placement}` : (isWin ? "Victory" : "Defeat")}
                </div>
                <div className="mh-champ-name">{formatChampionName(player.championName)}</div>
                <div className="mh-time-ago">{timeAgo}</div>
              </div>
            </div>
            <div className="mh-stats">
              <div className="mh-kda">
                <div className="mh-kda-numbers">
                  {player.kills} <span className="separator">/</span> <span className="deaths">{player.deaths}</span> <span className="separator">/</span> {player.assists}
                </div>
                <div className="mh-kda-ratio">{kdaRatio} KDA</div>
              </div>

              <div className="mh-game-info">
                <div className="mh-queue-mode">{getGameMode(match.queueId)}</div>
                <div className="mh-duration">
                  {Math.floor(match.gameDuration / 60)}:{(match.gameDuration % 60).toString().padStart(2, "0")}
                </div>
              </div>

              <div className="mh-items">
                {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
                  const itemId = player[`item${idx}`];
                  return itemId > 0 ? (
                    <img
                      key={idx}
                      src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/item/${itemId}.png`}
                      className="mh-item-icon"
                      onMouseEnter={(e) => handleItemEnter(itemId, e)}
                      onMouseMove={handleItemMove}
                      onMouseLeave={handleItemLeave}
                    />
                  ) : (
                    <div key={idx} className="mh-item-empty" />
                  );
                })}
              </div>
            </div>

            {renderMiniParticipants(match.players, match.queueId)}

            <div className="mh-actions">
              <button 
                className="mh-quick-view-btn"
                title="Quick View Details"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/match/${region || 'euw1'}/${match.matchId}?puuid=${puuid}`);
                }}
              >
                <TrendingUp size={16} />
              </button>
              <div className={`mh-toggle ${isWin ? "win" : "loss"}`}>
                <span className={`mh-toggle-arrow ${expanded ? "expanded" : ""}`}>▼</span>
              </div>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mh-details">
            {isArena ? renderArenaMatchDetails(match) : (
              <div className="mh-teams-grid">
                <div className="mh-team">
                  <div className="mh-team-header">
                    <div className="mh-team-dot blue" />
                    <h5 className="mh-team-name blue">Blue Team</h5>
                  </div>
                  <div className="mh-players">
                    {blue.map((p) => renderPlayerRow(p, p.puuid === puuid, match.queueId))}
                  </div>
                </div>
                <div className="mh-team">
                  <div className="mh-team-header">
                    <div className="mh-team-dot red" />
                    <h5 className="mh-team-name red">Red Team</h5>
                  </div>
                  <div className="mh-players">
                    {red.map((p) => renderPlayerRow(p, p.puuid === puuid, match.queueId))}
                  </div>
                </div>
              </div>
            )}
            <div className="mh-view-details-wrapper">
              <button 
                className={`mh-view-details-btn ${isWin ? "win" : "loss"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/match/${region || 'euw1'}/${match.matchId}?puuid=${puuid}`);
                }}
              >
                View Detailed Stats
              </button>
            </div>
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
    <div className="match-history">
      <div className="mh-filters">
        <div className="mh-filter-group">
          <label className="mh-filter-label">Champion</label>
          <div className="mh-select-wrapper">
            <input
              type="text"
              className="mh-filter-input"
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
              <div className="mh-dropdown custom-scrollbar">
                <div
                  className="mh-dropdown-item"
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
                      className="mh-dropdown-item"
                      onClick={() => {
                        setFilterChampion(champ);
                        setIsDropdownOpen(false);
                        setSearchQuery(formatChampionName(champ));
                      }}
                    >
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/champion/${champIdToName?.[champNameToId?.[champ]] || champ}.png`}
                        alt={champ}
                        onError={(e) => (e.target.src = "/placeholder-champ.png")}
                      />
                      <span>{formatChampionName(champ)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="mh-filter-group" style={{ minWidth: '11.25rem' }}>
          <label className="mh-filter-label">Queue</label>
          <div className="mh-select-wrapper">
            <select
              value={filterQueue}
              onChange={(e) => setFilterQueue(e.target.value)}
              className="mh-filter-select"
            >
              <option value="all">All Queues</option>
              <option value="420">Solo/Duo</option>
              <option value="440">Flex</option>
              <option value="450">ARAM</option>
              <option value="2400">Aram Mayhem</option>
              <option value="900">URF</option>
              <option value="480">Swiftplay</option>
              <option value="400">Draft</option>
              <option value="1700">Arena</option>
            </select>
            <div className="mh-select-chevron">
              <ChevronDown />
            </div>
          </div>
        </div>
      </div>

      {
        filteredMatches.length > 0 ? (
          filteredMatches.map((m, i) => renderMatch(m, i))
        ) : (
          <p className="mh-empty">No matches found matching filters</p>
        )
      }

      {hoveredItem && <ItemTooltip item={hoveredItem} position={tooltipPos} version={currentVersion} />}
    </div>
  );
}