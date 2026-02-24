import { Star, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MOCK_COACHES = [
  {
    id: 1,
    name: "Neace",
    rank: "Challenger",
    role: "Top/Mid",
    rating: 4.9,
    reviews: 124,
    price: 50,
    tags: ["Macro", "Wave Management", "VOD Review"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"
  },
  {
    id: 2,
    name: "Tarzaned",
    rank: "Grandmaster",
    role: "Jungle",
    rating: 4.8,
    reviews: 312,
    price: 45,
    tags: ["Pathing", "Invading", "Live Coaching"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/31.png"
  },
  {
    id: 3,
    name: "CoreJJ_Fan",
    rank: "Master",
    role: "Support",
    rating: 5.0,
    reviews: 89,
    price: 35,
    tags: ["Vision Control", "Roaming", "Bot Synergy"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/33.png"
  },
  {
    id: 4,
    name: "Saber",
    rank: "Challenger",
    role: "ADC",
    rating: 4.7,
    reviews: 156,
    price: 60,
    tags: ["Mechanics", "Positioning", "Trading"],
    image: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/35.png"
  }
];

export default function Coaching() {
  return (
    <div className="container max-w-7xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Coaching Marketplace</h1>
          <p className="text-muted-foreground text-lg">Learn from verified high-elo players.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold">
            Apply to be a Coach
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MOCK_COACHES.map(coach => (
          <Card key={coach.id} className="glass-panel border-border/50 overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-300">
            <CardHeader className="p-0">
              <div className="h-24 bg-gradient-to-r from-secondary to-background relative">
                <img 
                  src={coach.image} 
                  alt={coach.name} 
                  className="w-20 h-20 rounded-full border-4 border-card absolute -bottom-10 left-6 object-cover"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-14 pb-4 px-6 flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-display text-xl font-bold">{coach.name}</h3>
                  <div className="flex items-center text-sm text-primary font-medium">
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    {coach.rank}
                  </div>
                </div>
                <div className="flex items-center bg-secondary/50 px-2 py-1 rounded-md text-sm">
                  <Star className="w-4 h-4 text-yellow-400 mr-1 fill-yellow-400" />
                  <span className="font-bold">{coach.rating}</span>
                  <span className="text-muted-foreground ml-1">({coach.reviews})</span>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground mb-4">
                Specialty: <span className="text-foreground font-medium">{coach.role}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {coach.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs bg-secondary/80 text-secondary-foreground">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="px-6 py-4 border-t border-border/50 flex justify-between items-center bg-card/50">
              <div className="font-display text-xl font-bold text-foreground">
                ${coach.price}<span className="text-sm text-muted-foreground font-normal">/hr</span>
              </div>
              <Button size="sm" className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                Book Session
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
