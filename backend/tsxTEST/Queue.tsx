import { useState } from "react";
import { MessageSquare, Users, Swords, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MOCK_LFG = [
  {
    id: 1,
    author: "YasuoMain99",
    rank: "Emerald 2",
    role: "Mid",
    lookingFor: "Jungle",
    queueType: "Ranked Duo",
    timeAgo: "2 mins ago",
    description: "Looking for an aggressive jungler to duo with. I play Yasuo/Yone. Have discord.",
  },
  {
    id: 2,
    author: "SupportDiff",
    rank: "Diamond 4",
    role: "Support",
    lookingFor: "ADC",
    queueType: "Ranked Duo",
    timeAgo: "15 mins ago",
    description: "Enchanter main looking for hypercarry ADC. Peaked D2 last season. Chill vibes only.",
  },
  {
    id: 3,
    author: "ChillGamer",
    rank: "Silver 1",
    role: "Fill",
    lookingFor: "Any",
    queueType: "Normal Draft",
    timeAgo: "1 hr ago",
    description: "Just looking for some fun normal games to practice new champs. No toxicity.",
  },
  {
    id: 4,
    author: "ClashCaptain",
    rank: "Platinum",
    role: "Top",
    lookingFor: "Mid, ADC",
    queueType: "Clash",
    timeAgo: "3 hrs ago",
    description: "Need Tier 3 Mid and ADC for this weekend's clash. We practice on Fridays.",
  }
];

export default function Queue() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="container max-w-5xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Queue System</h1>
          <p className="text-muted-foreground">Find teammates to dominate the rift with.</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <Button className="font-bold gap-2">
            <Users className="w-4 h-4" />
            Post an Ad
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-border pb-px">
        {["all", "ranked", "normals", "clash"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="space-y-4">
        {MOCK_LFG.map((lfg) => (
          <div key={lfg.id} className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row gap-6 border-border/50 hover:bg-secondary/20 transition-colors">

            {/* User Info col */}
            <div className="w-full md:w-48 shrink-0 flex flex-col justify-center items-center md:items-start text-center md:text-left border-b md:border-b-0 md:border-r border-border/50 pb-4 md:pb-0 pr-0 md:pr-4">
              <div className="font-bold text-lg mb-1">{lfg.author}</div>
              <div className="text-primary font-medium text-sm mb-3">{lfg.rank}</div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-secondary/50">Me: {lfg.role}</Badge>
              </div>
            </div>

            {/* Content col */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none rounded-sm">
                    {lfg.queueType}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Swords className="w-3 h-3 mr-1" />
                    Looking for: <strong className="text-foreground ml-1">{lfg.lookingFor}</strong>
                  </span>
                  <span className="text-sm text-muted-foreground ml-auto">{lfg.timeAgo}</span>
                </div>
                <p className="text-muted-foreground">
                  "{lfg.description}"
                </p>
              </div>
            </div>

            {/* Action col */}
            <div className="flex items-center justify-center shrink-0">
              <Button className="w-full md:w-auto">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
