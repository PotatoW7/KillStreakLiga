import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const MOCK_POSTS = [
  {
    id: 1,
    author: {
      name: "Chovy Fanboy",
      handle: "@midlanegod",
      avatar: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/10.png"
    },
    content: "Just hit Master tier playing only control mages! The grind was real but definitely worth it. Anyone else climbing before the split ends?",
    image: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Azir_0.jpg",
    likes: 124,
    comments: 18,
    timeAgo: "2h ago"
  },
  {
    id: 2,
    author: {
      name: "Jungle Diff",
      handle: "@pathingpro",
      avatar: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/12.png"
    },
    content: "The new jungle changes on PBE are crazy. What do you guys think about the void grubs spawning earlier?",
    likes: 45,
    comments: 32,
    timeAgo: "5h ago"
  },
  {
    id: 3,
    author: {
      name: "T1 Official",
      handle: "@t1lol",
      avatar: "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/14.png"
    },
    content: "We are ready for the World Championship finals. #T1WIN",
    likes: 15420,
    comments: 892,
    timeAgo: "1d ago"
  }
];

export default function Feed() {
  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      {/* Compose Post */}
      <div className="glass-panel p-6 rounded-2xl mb-8 border-border/50">
        <div className="flex gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src="https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/588.png" />
            <AvatarFallback>ME</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <textarea 
              className="w-full bg-secondary/30 rounded-xl p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px] resize-none"
              placeholder="What's on your mind? Share your plays or thoughts..."
            ></textarea>
            <div className="flex justify-between items-center mt-3">
              <div className="text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors">
                + Add Image
              </div>
              <Button className="rounded-full px-6 font-bold">Post</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {MOCK_POSTS.map((post) => (
          <div key={post.id} className="glass-panel p-0 rounded-2xl border-border/50 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={post.author.avatar} />
                    <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold">{post.author.name}</div>
                    <div className="text-sm text-muted-foreground">{post.author.handle} • {post.timeAgo}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>
              
              <p className="text-foreground leading-relaxed mb-4">
                {post.content}
              </p>
            </div>

            {post.image && (
              <div className="w-full aspect-video bg-secondary">
                <img src={post.image} alt="Post media" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-4 flex items-center gap-6 border-t border-border/30 bg-card/30">
              <button className="flex items-center gap-2 text-muted-foreground hover:text-red-400 transition-colors group">
                <Heart className="w-5 h-5 group-hover:fill-red-400" />
                <span className="font-medium">{post.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-blue-400 transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium">{post.comments}</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-green-400 transition-colors ml-auto">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
