import { useSearch } from "wouter/use-browser-location";
import { Trophy, TrendingUp, Activity, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Mock data
const MOCK_SUMMONER = {
  name: "Faker",
  tag: "KR1",
  level: 843,
  icon: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/6.png",
  rank: {
    tier: "CHALLENGER",
    lp: 1243,
    wins: 342,
    losses: 289,
    winRate: 54,
  },
  topChampions: [
    { name: "Azir", points: "1.2M", winRate: 58, kda: "3.2", icon: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/Azir.png" },
    { name: "Orianna", points: "850K", winRate: 55, kda: "2.8", icon: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/Orianna.png" },
    { name: "Sylas", points: "620K", winRate: 52, kda: "3.5", icon: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/Sylas.png" },
  ],
  recentMatches: [
    { win: true, champion: "Azir", kda: "8/2/12", duration: "25:42", timeAgo: "2 hours ago", type: "Ranked Solo" },
    { win: false, champion: "Orianna", kda: "4/5/6", duration: "32:15", timeAgo: "5 hours ago", type: "Ranked Solo" },
    { win: true, champion: "Ahri", kda: "12/1/8", duration: "20:10", timeAgo: "1 day ago", type: "Ranked Solo" },
  ]
};

export default function Summoner() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const requestedName = searchParams.get("name") || "Faker#KR1";
  
  const [name, tag] = requestedName.split("#");
  
  // In a real app we'd fetch based on name/tag, using mock for now
  const summoner = {
    ...MOCK_SUMMONER,
    name: name || MOCK_SUMMONER.name,
    tag: tag || MOCK_SUMMONER.tag
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      {/* Profile Header */}
      <div className="glass-panel p-8 rounded-3xl mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
        
        <div className="relative">
          <img 
            src={summoner.icon} 
            alt="Profile Icon" 
            className="w-32 h-32 rounded-2xl border-4 border-secondary/50 shadow-2xl object-cover"
          />
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background border border-border px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            {summoner.level}
          </div>
        </div>

        <div className="flex-1 text-center md:text-left z-10">
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">
            {summoner.name} <span className="text-muted-foreground font-normal">#{summoner.tag}</span>
          </h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm">
              <Trophy className="w-4 h-4 mr-2 inline" />
              Top 0.01%
            </Badge>
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 px-3 py-1 text-sm">
              <Activity className="w-4 h-4 mr-2 inline" />
              In Game
            </Badge>
          </div>
        </div>

        {/* Rank Card inside Header */}
        <div className="bg-secondary/50 rounded-2xl p-6 border border-border/50 min-w-[250px] z-10 text-center md:text-right">
          <div className="text-sm text-muted-foreground font-medium mb-1 uppercase tracking-wider">Ranked Solo</div>
          <div className="font-display text-3xl font-bold text-primary mb-1">{summoner.rank.tier}</div>
          <div className="text-xl mb-4">{summoner.rank.lp} LP</div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{summoner.rank.wins}W / {summoner.rank.losses}L</span>
            <span className="font-medium text-green-400">{summoner.rank.winRate}% WR</span>
          </div>
          <Progress value={summoner.rank.winRate} className="h-2 bg-secondary" />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="font-display text-xl">Top Champions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {summoner.topChampions.map((champ, i) => (
                <div key={i} className="flex items-center gap-4">
                  <img src={champ.icon} alt={champ.name} className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <div className="font-semibold">{champ.name}</div>
                    <div className="text-sm text-muted-foreground">{champ.points} pts</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${champ.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {champ.winRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">{champ.kda} KDA</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Matches) */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="font-display text-2xl font-bold mb-4">Recent Matches</h2>
          {summoner.recentMatches.map((match, i) => (
            <div key={i} className={`flex items-center p-4 rounded-xl border ${match.win ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className={`w-2 h-12 rounded-full mr-4 ${match.win ? 'bg-blue-500' : 'bg-red-500'}`} />
              <div className="flex-1">
                <div className="font-bold text-lg">{match.type}</div>
                <div className="text-sm text-muted-foreground">{match.timeAgo} • {match.duration}</div>
              </div>
              <div className="text-center px-6">
                <div className="font-display text-xl font-bold">{match.kda}</div>
                <div className="text-sm text-muted-foreground">KDA</div>
              </div>
              <div className="w-32 flex justify-end">
                <Badge variant="secondary" className={match.win ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}>
                  {match.win ? 'VICTORY' : 'DEFEAT'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
