import React, { useState, useEffect } from "react";
import { fetchDDragon } from "../utils/fetchDDragon";
import ItemTooltip from "./ItemTooltip";

export default function MatchHistory({ matches, champIdToName, champNameToId, itemsData, version, puuid, onPlayerClick }) {
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [latestVersion, setLatestVersion] = useState(version);
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [filterChampion, setFilterChampion] = useState("all");
  const [filterQueue, setFilterQueue] = useState("all");
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!version) {
      fetchDDragon()
        .then((data) => setLatestVersion(data.latestVersion))
        .catch((error) => console.error("Failed to fetch DDragon data:", error));
    }
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
    };
    const spellName = spellMap[spellId];
    if (!spellName) {
      console.log(`Unknown summoner spell ID: ${spellId}`);
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
          <div className="runes-full" onMouseLeave={() => setHoveredPlayer(null)}>
            {primary && (
              <>
                <img src={getRuneIconPath(primary.style)} alt="Primary Style" className="rune-style-icon" />
                <div className="primary-runes">
                  {primary.selections?.map((s, i) => (
                    <img key={i} src={getRuneIconPath(s.perk)} className={`rune-icon ${i === 0 ? "keystone" : "primary-rune"}`} onError={(e) => (e.target.src = "/runes/unknown.png")} />
                  ))}
                </div>
              </>
            )}
            {secondary && (
              <>
                <img src={getRuneIconPath(secondary.style)} alt="Secondary Style" className="rune-style-icon" />
                <div className="secondary-runes">
                  {secondary.selections?.map((s, i) => (
                    <img key={i} src={getRuneIconPath(s.perk)} className="rune-icon secondary-rune" onError={(e) => (e.target.src = "/runes/unknown.png")} />
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
      <div className="objectives-row">
        {Object.entries(teamObjectives).map(([key, val]) =>
          val > 0 && (
            <div key={key} className="objective-item">
              <span className="objective-text">{key.charAt(0).toUpperCase() + key.slice(1)}: {val}</span>
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

  const renderPlayerRow = (p, isCurrent) => {
    const key = `${p.puuid}-${p.championName}`;


    const trinketId = p.item6;
    const normalItems = p.items.slice(0, 6).filter((id) => id > 0);
    const emptySlots = 6 - normalItems.length;
    const itemsOrdered = [...normalItems, ...Array(emptySlots).fill(0)];

    return (
      <div className={`player-row ${isCurrent ? "current-player" : ""}`} key={p.puuid}>
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/champion/${champIdToName?.[p.championId] || p.championName}.png`}
          className="champion-icon"
          onError={(e) => (e.target.src = "/placeholder-champ.png")}
        />
        <div className="summoner-spells">
          <img src={getSummonerSpellPath(p.summoner1Id)} className="summoner-spell" />
          <img src={getSummonerSpellPath(p.summoner2Id)} className="summoner-spell" />
        </div>
        <div className="runes-section">{renderPlayerRunes(p, key)}</div>
        <div className="player-info">
          <div className="champion-name">{formatChampionName(p.championName)}</div>
          <div className={`player-name ${!isCurrent ? "clickable-player" : ""}`} onClick={!isCurrent ? (e) => handlePlayerClick(p.riotId, e) : undefined}>{p.riotId}</div>
          <div className="player-kda">{p.kills}/{p.deaths}/{p.assists}</div>
        </div>
        <div className="items-row">
          {itemsOrdered.map((id, i) =>
            id > 0 ? (
              <img
                key={i}
                src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/item/${id}.png`}
                className="item-icon"
                onMouseEnter={(e) => handleItemEnter(id, e)}
                onMouseMove={handleItemMove}
                onMouseLeave={handleItemLeave}
              />
            ) : (
              <div key={i} className="item-icon" />
            )
          )}
          {trinketId > 0 && (
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/item/${trinketId}.png`}
              className="item-icon trinket-icon"
              onMouseEnter={(e) => handleItemEnter(trinketId, e)}
              onMouseMove={handleItemMove}
              onMouseLeave={handleItemLeave}
            />
          )}
        </div>
      </div>
    );
  };

  const getGameMode = (queueId) => {
    const modes = { 420: "Solo/Duo", 440: "Flex", 400: "Draft", 450: "ARAM", 480: "Swiftplay", 900: "URF", 1700: "Arena", 2400: "Aram Mayhem" };
    return modes[queueId] || "Normal";
  };

  const renderMatch = (match, i) => {
    const player = match.players.find((p) => p.puuid === puuid);
    if (!player) return null;
    const blue = match.players.filter((p) => p.teamId === 100);
    const red = match.players.filter((p) => p.teamId === 200);
    const expanded = expandedMatch === i;
    const playerItems = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5].filter(id => id > 0);
    const kdaRatio = calculateKDA(player.kills, player.deaths, player.assists);
    const timeAgo = getTimeAgo(match.gameEndTimestamp || match.gameStartTimestamp);

    return (
      <div key={i} className={`match-card ${player.win ? "victory" : "defeat"}`}>
        <div className="match-header" onClick={() => toggleMatch(i)}>
          <div className="match-basic-info">
            <div className={`match-result ${player.win ? "victory" : "defeat"}`}>
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/champion/${champIdToName?.[player.championId] || player.championName}.png`}
                className="match-champion-icon"
                onError={(e) => (e.target.src = "/placeholder-champ.png")}
              />
              <div className="champion-info">
                <div className="champion-name">{formatChampionName(player.championName)}</div>
                <span className="result-text">{player.win ? "VICTORY" : "DEFEAT"}</span>
                <div className="match-time">{timeAgo}</div>
              </div>
            </div>
            <div className="match-game-info">
              <div className="match-mode">{getGameMode(match.queueId)}</div>
              <div className="match-duration">{Math.floor(match.gameDuration / 60)}:{(match.gameDuration % 60).toString().padStart(2, "0")}</div>
            </div>
            <div className="match-stats">
              <div className="match-kda">
                <div className="kda-numbers">{player.kills}/{player.deaths}/{player.assists}</div>
                <div className="kda-ratio-compact">{kdaRatio} KDA</div>
              </div>
              <div className="match-build">
                <div className="match-items">
                  {playerItems.map((id, index) =>
                    id > 0 ? (
                      <img
                        key={index}
                        src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/item/${id}.png`}
                        className="match-item"
                        onMouseEnter={(e) => handleItemEnter(id, e)}
                        onMouseMove={handleItemMove}
                        onMouseLeave={handleItemLeave}
                      />
                    ) : (
                      <div key={index} className="match-item" />
                    )
                  )}
                  {player.item6 > 0 && (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/item/${player.item6}.png`}
                      className="match-item trinket"
                      onMouseEnter={(e) => handleItemEnter(player.item6, e)}
                      onMouseMove={handleItemMove}
                      onMouseLeave={handleItemLeave}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {expanded && (
          <div className="match-details">
            <div className="objectives-section">
              <div className="team-objectives blue-team">
                <h5>Blue Team Objectives</h5>
                {renderObjectives(match.teams?.[100])}
              </div>
              <div className="team-objectives red-team">
                <h5>Red Team Objectives</h5>
                {renderObjectives(match.teams?.[200])}
              </div>
            </div>
            <div className="team-container">
              <div className="team blue-team">
                <h4>Blue Team</h4>
                {blue.map((p) => renderPlayerRow(p, p.puuid === puuid))}
              </div>
              <div className="team red-team">
                <h4>Red Team</h4>
                {red.map((p) => renderPlayerRow(p, p.puuid === puuid))}
              </div>
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
    <div className="match-container">
      <h3 className="text-center">Match History</h3>

      <div className="match-filters">
        <div className="filter-group">
          <label>Champion:</label>
          <select value={filterChampion} onChange={(e) => setFilterChampion(e.target.value)}>
            <option value="all">All Champions</option>
            {playedChampions.map(champ => (
              <option key={champ} value={champ}>{formatChampionName(champ)}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Queue:</label>
          <select value={filterQueue} onChange={(e) => setFilterQueue(e.target.value)}>
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
        </div>
      </div>

      {filteredMatches.length > 0 ? (
        filteredMatches.map((m, i) => renderMatch(m, i))
      ) : (
        <p className="text-center unranked">No matches found matching filters</p>
      )}

      {hoveredItem && <ItemTooltip item={hoveredItem} position={tooltipPos} />}
    </div>
  );
}