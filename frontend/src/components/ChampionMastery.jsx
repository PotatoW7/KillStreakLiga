import React from "react";

export default function ChampionMastery({ masteryData, champIdToName, version }) {
  if (!masteryData || masteryData.length === 0) return (
    <div className="italic text-muted-foreground text-xs p-4">No mastery data discovered.</div>
  );

  return (
    <div className="space-y-4">
      {masteryData.slice(0, 5).map(entry => {
        const champName = champIdToName[entry.championId] || `ID ${entry.championId}`;
        const champIcon = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`;

        return (
          <div className="bg-secondary/40 border border-white/5 p-4 rounded-xl flex items-center gap-4 hover:border-primary/20 transition-all group/mastery" key={entry.championId}>
            <div className="relative">
              <img src={champIcon} alt={champName} className="w-12 h-12 rounded-lg border border-white/10 group-hover/mastery:scale-105 transition-transform" />
              <div className="absolute -bottom-1 -right-1 bg-background border border-primary text-primary w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black">
                {entry.championLevel}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-display font-black text-foreground group-hover/mastery:text-primary transition-colors">{champName}</div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">
                {entry.championPoints.toLocaleString()} Points
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
