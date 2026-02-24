import React from "react";

export default function ChampionMastery({ masteryData, champIdToName, version }) {
  if (!masteryData || masteryData.length === 0) return (
    <div className="mastery-empty">No mastery data discovered.</div>
  );

  return (
    <div className="mastery-list">
      {masteryData.slice(0, 5).map(entry => {
        const champName = champIdToName[entry.championId] || `ID ${entry.championId}`;
        const champIcon = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`;

        return (
          <div className="mastery-card" key={entry.championId}>
            <div className="mastery-icon-wrapper">
              <img src={champIcon} alt={champName} className="mastery-icon" />
              <div className="mastery-level-badge">
                {entry.championLevel}
              </div>
            </div>
            <div className="mastery-info">
              <div className="mastery-champ-name">{champName}</div>
              <div className="mastery-points">
                {entry.championPoints.toLocaleString()} Points
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
