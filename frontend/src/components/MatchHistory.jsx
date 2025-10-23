export default function MatchHistory({ matches, champNameToId, version, puuid }) {
  const renderItemIcons = (items, trinket) => (
    <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {items.map((id, i) =>
        id > 0 ? (
          <img
            key={i}
            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png`}
            width="24"
            height="24"
            style={{ border: "1px solid white", borderRadius: "4px" }}
          />
        ) : null
      )}
      {trinket > 0 && (
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${trinket}.png`}
          width="24"
          height="24"
          style={{ border: "1px solid white", borderRadius: "4px", boxShadow: "0 0 4px #ffcc00" }}
        />
      )}
    </div>
  );

  const renderTeam = (team, side) => {
    const labelColor = side === "blue" ? "#00c6ff" : "#ff4c4c";
    const teamWin = team[0]?.win;
    return (
      <div style={{ marginTop: "10px" }}>
        <h4 style={{ color: labelColor }}>
          {side === "blue" ? "Blue Side" : "Red Side"} —{" "}
          <span style={{ color: teamWin ? "#00ff88" : "#ff4c4c" }}>
            {teamWin ? "Victory" : "Defeat"}
          </span>
        </h4>
        <div className="team-grid">
          {team.map((p, i) => {
            const champIcon = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${p.championName}.png`;
            return (
              <div key={i} className="player-card" style={{ borderLeft: `3px solid ${labelColor}` }}>
                <img src={champIcon} alt={p.championName} width="32" height="32" /><br />
                <strong>{p.riotId}</strong><br />
                {p.championName}<br />
                <span>KDA: {p.kills}/{p.deaths}/{p.assists}</span><br />
                <span>CS: {p.totalMinionsKilled ?? 0}</span><br />
                <span>Vision: {p.visionScore ?? 0}</span>
                {renderItemIcons(p.items, p.trinket)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <h4 style={{ marginTop: "20px", color: "#00c6ff" }}>Last 2 Games:</h4>
      {matches.map((match, i) => {
        const readableMode =
          match.queueId === 420 ? "Ranked Solo/Duo" :
          match.queueId === 440 ? "Ranked Flex" :
          match.queueId === 400 ? "Draft Pick" :
          match.queueId === 450 ? "ARAM" :
          match.queueId === 480 || match.gameMode === "SWIFTPLAY" ? "Swiftplay" :
          match.queueId === 1700 || match.gameMode === "CHERRY" ? "Arena" :
          match.gameMode || "Other";
        return (
          <div key={i} className="match-block">
            <div className="match-header">
              <span><strong>Game {i + 1}</strong> ({readableMode})</span>
              <span><strong>Duration:</strong> {match.gameDuration ? (match.gameDuration / 60).toFixed(1) : "N/A"} min</span>
            </div>
            {readableMode === "Arena"
              ? <div>Arena rendering not implemented</div>
              : <>
                  {renderTeam(match.players.slice(0, 5), "blue")}
                  {renderTeam(match.players.slice(5, 10), "red")}
                </>
            }
          </div>
        );
      })}
    </>
  );
}
