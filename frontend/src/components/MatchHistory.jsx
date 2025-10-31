import React, { useState } from "react";

export default function MatchHistory({ matches, champNameToId, version, puuid }) {
  const [expandedMatch, setExpandedMatch] = useState(null);

  const toggleMatch = (index) => setExpandedMatch(expandedMatch === index ? null : index);

  const renderPlayerRow = (player, isCurrentPlayer = false) => (
    <div className={`player-row ${isCurrentPlayer ? 'current-player' : ''}`} key={player.puuid}>
      <img 
        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${player.championName}.png`} 
        alt={player.championName} 
        className="champion-icon"
      />
      <div className="player-name">{player.riotId}</div>
      <div className="player-stats">
        <div className="player-kda">{player.kills}/{player.deaths}/{player.assists}</div>
        <div className="kda-ratio">
          KDA: {player.deaths > 0 ? ((player.kills + player.assists)/player.deaths).toFixed(2) : (player.kills + player.assists).toFixed(2)}
        </div>
      </div>
      <div className="items-row">
        {player.items.slice(0,6).map((itemId,i) => 
          itemId > 0 
            ? <img key={i} src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`} className="item-icon"/> 
            : <div key={i} className="item-icon"/>
        )}
      </div>
    </div>
  );

 const getGameMode = (queueId) => {
  const gameModes = {
    420: "Solo/Duo",
    440: "Flex",
    400: "Draft",
    450: "ARAM",
    480: "Swiftplay", // Added Swiftplay
    830: "Co-op vs AI",
    840: "Co-op vs AI",
    850: "Co-op vs AI",
    900: "URF",
    1300: "Nexus Blitz",
    1700: "Arena"
  };
  
  // For custom modes or if we have mode info from backend
  if (queueId === "swiftplay") return "Swiftplay";
  if (queueId === "arena") return "Arena";
  if (queueId === "draft") return "Draft";
  if (queueId === "aram") return "ARAM";
  if (queueId === "solo_duo") return "Solo/Duo";
  if (queueId === "ranked_flex") return "Flex";
  
  return gameModes[queueId] || "Normal";
};

  const renderMatch = (match, index) => {
    const player = match.players.find(p => p.puuid === puuid);
    if (!player) return null;

    const blueTeam = match.players.filter(p => p.teamId === 100);
    const redTeam = match.players.filter(p => p.teamId === 200);
    const isExpanded = expandedMatch === index;
    const kdaRatio = player.deaths > 0 ? ((player.kills + player.assists)/player.deaths).toFixed(2) : (player.kills + player.assists).toFixed(2);

    return (
      <div key={index} className={`match-card ${player.win ? 'victory' : 'defeat'}`}>
        <div className="match-header" onClick={() => toggleMatch(index)}>
          <div className="match-basic-info">
            <div className={`match-result ${player.win ? 'victory' : 'defeat'}`}>
              <img 
                className="match-champion-icon" 
                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${player.championName}.png`} 
                alt={player.championName} 
              />
              <span className="result-text">{player.win ? "VICTORY" : "DEFEAT"}</span>
            </div>
            
            <div className="match-game-info">
              <div className="match-mode">{getGameMode(match.queueId || match.gameMode)}</div>
              <div className="match-duration">{Math.floor(match.gameDuration/60)}:{(match.gameDuration%60).toString().padStart(2,'0')}</div>
            </div>
          </div>

          <div className="match-stats">
            <div className="match-kda">
              <div className="kda-numbers">{player.kills}/{player.deaths}/{player.assists}</div>
              <div className="kda-ratio-compact">{kdaRatio} KDA</div>
            </div>
            
            <div className="match-build">
              <div className="match-items">
                {player.items.slice(0,6).map((itemId,i) => 
                  itemId > 0 
                    ? <img key={i} src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`} className="match-item"/> 
                    : <div key={i} className="match-item"/>
                )}
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="match-details">
            <div className="team-container">
              <div className="team blue-team">
                <h4>Blue Team</h4>
                {blueTeam.map(p => renderPlayerRow(p, p.puuid === puuid))}
              </div>
              <div className="team red-team">
                <h4>Red Team</h4>
                {redTeam.map(p => renderPlayerRow(p, p.puuid === puuid))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="match-container">
      <h3 className="text-center">Match History</h3>
      {matches.length > 0 ? matches.map((m,i)=>renderMatch(m,i)) : <p className="text-center unranked">No recent matches found</p>}
    </div>
  );
}