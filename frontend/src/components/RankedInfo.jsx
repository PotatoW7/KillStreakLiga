export default function RankedInfo({ rankedSolo, rankedFlex }) {
  const formatRank = (rank) => {
    if (!rank) return <div className="rank-block">Unranked</div>;
    const winrate = rank.wins + rank.losses > 0
      ? Math.round((rank.wins / (rank.wins + rank.losses)) * 100)
      : 0;
    return (
      <div className="rank-block">
        <strong>{rank.queueType === "RANKED_SOLO_5x5" ? "Solo/Duo" : "Flex"}:</strong><br />
        {rank.tier} {rank.rank} — {rank.leaguePoints} LP<br />
        {rank.wins}W / {rank.losses}L ({winrate}% WR)
      </div>
    );
  };

  return (
    <>
      {formatRank(rankedSolo)}
      {formatRank(rankedFlex)}
    </>
  );
}
