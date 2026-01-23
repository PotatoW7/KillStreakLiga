import React from "react";

export default function RankedInfo({ rankedSolo, rankedFlex, compact = false }) {
  const getRankIcon = (tier) => tier ? `/rank-icons/Rank=${tier.charAt(0).toUpperCase()+tier.slice(1).toLowerCase()}.png` : null;

  const renderRankCard = (queue, queueName) => {
    if (!queue) return (
      <div className={`rank-card ${compact ? 'compact' : ''}`}>
        <div className="queue-name">{queueName}</div>
        <div className="unranked">Unranked</div>
      </div>
    );

    const totalGames = queue.wins + queue.losses;
    const winRate = totalGames > 0 ? Math.round((queue.wins/totalGames)*100) : 0;

    if (compact) {
      return (
        <div className="rank-card compact">
          <div className="rank-info">
            {getRankIcon(queue.tier) && <img src={getRankIcon(queue.tier)} alt={`${queue.tier} icon`} className="rank-icon"/>}
            <div className="rank-details">
              <div className="tier">{queue.tier} {queue.rank}</div>
              <div className="queue-label">{queueName}</div>
              <div className="stats">
                <div className="lp">{queue.leaguePoints} LP</div>
                <div className="winrate">{winRate}% WR</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rank-card">
        <div className="rank-info">
          {getRankIcon(queue.tier) && <img src={getRankIcon(queue.tier)} alt={`${queue.tier} icon`} className="rank-icon"/>}
          <div className="rank-details">
            <div className="tier">{queue.tier} {queue.rank}</div>
            <div className="queue-label">{queueName}</div>
            <div className="stats">
              <div className="lp">{queue.leaguePoints} LP</div>
              <div className="winrate">{winRate}% WR</div>
              <div className="games">{totalGames}G</div>
            </div>
            <div className="record">{queue.wins}W {queue.losses}L</div>
          </div>
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="ranked-container compact">
        {renderRankCard(rankedSolo, "SOLO/DUO")}
        {renderRankCard(rankedFlex, "FLEX")}
      </div>
    );
  }

  return (
    <div className="ranked-container">
      {renderRankCard(rankedSolo, "Solo/Duo")}
      {renderRankCard(rankedFlex, "Flex")}
    </div>
  );
}