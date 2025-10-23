// Renamed back from ChampionMasteryFixed
import React from "react";

export default function ChampionMastery({ masteryData, champIdToName, winrateMap, version }) {
  if (!masteryData || masteryData.length === 0) {
    return <p>No mastery data available.</p>;
  }

  return (
    <>
      <h4 style={{ color: "#ffcc00" }}>Top Champion Masteries:</h4>
      {masteryData.slice(0, 5).map(entry => {
        const champName = champIdToName[entry.championId] || `ID ${entry.championId}`;
        const champIcon = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`;
        const winStats = winrateMap[entry.championId];
        const winrate = winStats?.games > 0 ? Math.round((winStats.wins / winStats.games) * 100) : "N/A";

        return (
          <div key={entry.championId} className="rank-block" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <img src={champIcon} alt={champName} width="48" height="48" />
            <div>
              <strong>{champName}</strong><br />
              Mastery Level: {entry.championLevel}<br />
              Points: {entry.championPoints.toLocaleString()}<br />
              Winrate: {winrate}%
            </div>
          </div>
        );
      })}
    </>
  );
}
