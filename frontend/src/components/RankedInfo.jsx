import React from "react";

export default function RankedInfo({ rankedSolo, rankedFlex, compact = false }) {
  const getRankIcon = (tier) => tier ? `/rank-icons/Rank=${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}.png` : null;

  const renderRankCard = (queue, queueName) => {
    if (!queue) return (
      <div className="bg-secondary/20 border border-white/5 p-5 rounded-2xl">
        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{queueName}</div>
        <div className="text-sm font-bold opacity-20 italic">Not Ranked</div>
      </div>
    );

    const totalGames = queue.wins + queue.losses;
    const winRate = totalGames > 0 ? Math.round((queue.wins / totalGames) * 100) : 0;

    return (
      <div className="bg-secondary/40 border border-white/10 p-5 rounded-2xl hover:border-primary/30 transition-all group/rank relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover/rank:bg-primary/10 transition-colors" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="relative">
            {getRankIcon(queue.tier) && (
              <img
                src={getRankIcon(queue.tier)}
                alt={queue.tier}
                className="w-14 h-14 group-hover/rank:scale-110 transition-transform duration-500 drop-shadow-2xl"
              />
            )}
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1">{queueName}</div>
            <div className="font-display text-xl font-black text-primary leading-tight">{queue.tier} {queue.rank}</div>
            <div className="flex items-center gap-4 mt-2 text-[10px] font-black text-foreground/80 uppercase tracking-widest">
              <span>{queue.leaguePoints} LP</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className={winRate >= 50 ? 'text-green-400' : 'text-red-400'}>{winRate}% Win Rate</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4">
      {renderRankCard(rankedSolo, "Ranked Solo")}
      {renderRankCard(rankedFlex, "Ranked Flex")}
    </div>
  );
}
