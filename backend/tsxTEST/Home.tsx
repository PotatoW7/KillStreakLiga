import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Target, Users, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();
  const [summonerName, setSummonerName] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (summonerName.trim()) {
      setLocation(`/summoner?name=${encodeURIComponent(summonerName)}`);
    }
  };

  const features = [
    {
      title: "Player Stats",
      description: "Deep dive into your performance, win rates, and champion mastery.",
      icon: Target,
      color: "text-blue-500",
    },
    {
      title: "Find Teammates",
      description: "Use the Queue system to find players that match your rank and playstyle.",
      icon: Users,
      color: "text-green-500",
    },
    {
      title: "Pro Coaching",
      description: "Learn from Challenger and Grandmaster players to rank up fast.",
      icon: BookOpen,
      color: "text-primary",
    }
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden flex flex-col items-center justify-center min-h-[60vh] py-20 px-4 text-center">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6 relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
          DOMINATE THE RIFT
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-10 relative z-10">
          The ultimate League of Legends companion. Track stats, find duo partners, and learn from the best coaches.
        </p>

        <form onSubmit={handleSearch} className="w-full max-w-xl relative z-10 glass-panel rounded-full p-2 flex items-center shadow-2xl shadow-primary/20">
          <div className="flex-1 flex items-center px-4">
            <Search className="h-5 w-5 text-muted-foreground mr-3" />
            <Input 
              type="text"
              placeholder="Enter Riot ID (e.g. Faker#KR1)"
              className="border-0 bg-transparent focus-visible:ring-0 text-lg placeholder:text-muted-foreground/50 h-12"
              value={summonerName}
              onChange={(e) => setSummonerName(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="rounded-full px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
            Search
          </Button>
        </form>
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-6xl px-4 py-20">
        <h2 className="font-display text-3xl font-bold text-center mb-12">Level Up Your Game</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
              <div className={`p-4 rounded-full bg-secondary mb-6 ${feature.color}`}>
                <feature.icon className="h-8 w-8" />
              </div>
              <h3 className="font-display text-2xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
