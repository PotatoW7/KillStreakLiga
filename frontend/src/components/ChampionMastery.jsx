import React from "react";

export default function ChampionMastery({ masteryData, champIdToName, version }) {
  if (!masteryData || masteryData.length === 0) return <p>No mastery data available.</p>;

  return (
    <div className="mastery-container">
      <h4>Top Champion Masteries:</h4>
      <div className="mastery-grid">
        {masteryData.slice(0, 5).map(entry => {
          const champName = champIdToName[entry.championId] || `ID ${entry.championId}`;
          const champIcon = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`;


          return (
            <div className="mastery-card" key={entry.championId}>
              <img src={champIcon} alt={champName} className="champion-icon" />
              <div className="mastery-info">
                <strong>{champName}</strong>
                <div className="mastery-level">Mastery: {entry.championLevel}</div>
                <div className="mastery-points">Points: {entry.championPoints.toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
