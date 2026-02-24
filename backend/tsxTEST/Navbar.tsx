import { Link, useLocation } from "wouter";
import { Search, Users, Trophy, MessageSquare, Gamepad2, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [location] = useLocation();

  const navItems = [
    { name: "Summoner", path: "/summoner", icon: Search },
    { name: "Queue (LFG)", path: "/queue", icon: Users },
    { name: "Coaching", path: "/coaching", icon: Trophy },
    { name: "Feed", path: "/feed", icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-2 mr-6 text-primary hover:text-primary/90 transition-colors">
          <Gamepad2 className="h-6 w-6" />
          <span className="font-display font-bold text-2xl tracking-wider">RiftHub</span>
        </Link>
        
        <nav className="flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-2 transition-colors hover:text-primary",
                location === item.path ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors bg-secondary px-3 py-1.5 rounded-full">
            <UserCircle className="h-5 w-5" />
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
}
