import React from "react";

export default function RankedInfo({ rankedSolo, rankedFlex, compact = false }) {
  const getRankIcon = (tier) => tier ? `/rank-icons/Rank=${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}.png` : null;

  const renderRankCard = (queue, queueName) => {
    if (!queue) return (
      <div className="ranked-card-empty">
        <div className="ranked-queue-label">{queueName}</div>
        <div className="ranked-unranked">Not Ranked</div>
      </div>
    );

    const totalGames = queue.wins + queue.losses;
    const winRate = totalGames > 0 ? Math.round((queue.wins / totalGames) * 100) : 0;

    return (
      <div className="ranked-card">
        <div className="ranked-card-glow" />

        <div className="ranked-card-content">
          <div className="ranked-icon-wrapper">
            {getRankIcon(queue.tier) && (
              <img
                src={getRankIcon(queue.tier)}
                alt={queue.tier}
                className="ranked-icon"
              />
            )}
          </div>
          <div className="ranked-info">
            <div className="ranked-queue-label-sm">{queueName}</div>
            <div className="ranked-tier">{queue.tier} {queue.rank}</div>
            <div className="ranked-stats">
              <span>{queue.leaguePoints} LP</span>
              <div className="ranked-stats-dot" />
              <span className={winRate >= 50 ? 'winrate-positive' : 'winrate-negative'}>{winRate}% Win Rate</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ranked-grid">
      {renderRankCard(rankedSolo, "Ranked Solo")}
      {renderRankCard(rankedFlex, "Ranked Flex")}
    </div>
  );
}
