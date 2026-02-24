import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, onSnapshot, getDoc, doc } from "firebase/firestore";
import ProfilePosts from "./ProfilePosts";
import { Award, TrendingUp, Clock, Search, ChevronDown, Users, Bell, Zap, Activity, Lock, ChevronRight } from "lucide-react";

function Feeds() {
    const [user, setUser] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [likesLeaderboard, setLikesLeaderboard] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("recent");

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        setProfileImage(userDoc.data().profileImage || null);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        setLoading(true);
        const postsQuery = query(collection(db, "posts"));

        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            let filteredPosts = fetchedPosts.filter(post =>
                !post.visibility || post.visibility === "public"
            );

            const userLikesMap = {};
            filteredPosts.forEach(post => {
                if (post.userId) {
                    if (!userLikesMap[post.userId]) {
                        userLikesMap[post.userId] = {
                            userId: post.userId,
                            username: post.username || "Unknown",
                            profileImage: post.userProfileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png",
                            totalLikes: 0
                        };
                    }
                    userLikesMap[post.userId].totalLikes += (post.likes?.length || 0);
                }
            });

            const leaderboard = Object.values(userLikesMap)
                .filter(u => u.totalLikes > 0)
                .sort((a, b) => b.totalLikes - a.totalLikes)
                .slice(0, 5);

            const enrichLeaderboard = async () => {
                const enriched = await Promise.all(leaderboard.map(async (entry) => {
                    try {
                        const userDoc = await getDoc(doc(db, "users", entry.userId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            return {
                                ...entry,
                                username: userData.username || entry.username,
                                profileImage: userData.profileImage || entry.profileImage
                            };
                        }
                    } catch (err) {
                        console.error("Error fetching live user data for leaderboard:", err);
                    }
                    return entry;
                }));
                setLikesLeaderboard(enriched);
            };

            enrichLeaderboard();

            if (activeTab === "recent") {
                filteredPosts.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
            } else {
                filteredPosts.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
            }

            setPosts(filteredPosts);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching public posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeTab]);

    const filteredPostsBySearch = posts.filter(post =>
        post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );


    return (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex flex-col lg:flex-row gap-8">
                <main className="flex-1 min-w-0 space-y-8">
                    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-background to-background border border-white/5 p-10 md:p-16">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
                        <div className="relative z-10 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-6 backdrop-blur-md">
                                <Zap className="w-3 h-3 text-primary animate-pulse" />
                                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-primary">Live Community Feed</span>
                            </div>
                            <h1 className="font-display text-5xl md:text-7xl font-black tracking-tighter text-white mb-6 leading-none">
                                COMMUNITY<br /><span className="text-primary italic">FEED</span>
                            </h1>
                            <p className="text-muted-foreground text-lg md:text-xl font-medium leading-relaxed">
                                Curating community highlights, top discussions, and global RiftHub activity.
                            </p>
                        </div>
                    </div>

                    <div className="sticky top-24 z-30 glass-panel rounded-2xl p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2 shadow-2xl shadow-black/20">
                        <div className="flex-1 flex p-1 bg-white/5 rounded-xl gap-1">
                            <button
                                onClick={() => setActiveTab('recent')}
                                className={`flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] transition-all ${activeTab === 'recent' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                Latest
                            </button>
                            <button
                                onClick={() => setActiveTab('trending')}
                                className={`flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] transition-all ${activeTab === 'trending' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}
                            >
                                <TrendingUp className="w-3.5 h-3.5" />
                                Trending
                            </button>
                        </div>

                        <div className="relative group flex-1 md:max-w-xs">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search community posts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-primary/30 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold placeholder:text-muted-foreground/30 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                            <div className="relative">
                                <Activity className="w-12 h-12 text-primary animate-pulse" />
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                            </div>
                            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/40 animate-pulse italic">Loading Community Feed...</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <ProfilePosts
                                user={user}
                                profileImage={profileImage}
                                posts={filteredPostsBySearch}
                                isOwnProfile={true}
                                isFeedsPage={true}
                                onPostCreated={() => { }}
                            />
                        </div>
                    )}
                </main>

                <aside className="w-full lg:w-96 space-y-8">
                    <div className="glass-panel rounded-[2rem] overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-primary/5 to-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-display text-2xl font-black tracking-tight text-white italic">TOP PERFORMERS</h3>
                                <img src="/project-icons/Feeds icons/leaderboard.png" alt="" className="w-8 h-8 object-contain" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Highest Community Engagement</p>
                        </div>
                        <div className="p-2 space-y-1">
                            {likesLeaderboard.map((leader, index) => (
                                <button
                                    key={leader.userId}
                                    onClick={() => window.location.href = `/profile/${leader.userId}`}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 group transition-all text-left"
                                >
                                    <div className="relative">
                                        <div className={`w-12 h-12 rounded-xl border-2 overflow-hidden transition-all group-hover:scale-105 ${index === 0 ? 'border-primary shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-white/10'}`}>
                                            <img src={leader.profileImage} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="absolute -top-2 -left-2 w-7 h-7 flex items-center justify-center">
                                            {index === 0 && <img src="/project-icons/Feeds icons/medal first.png" alt="" className="w-full h-full object-contain drop-shadow-lg" />}
                                            {index === 1 && <img src="/project-icons/Feeds icons/medal second.png" alt="" className="w-full h-full object-contain drop-shadow-lg" />}
                                            {index === 2 && <img src="/project-icons/Feeds icons/medal third.png" alt="" className="w-full h-full object-contain drop-shadow-lg" />}
                                            {index > 2 && (
                                                <div className="w-6 h-6 rounded-lg bg-secondary border border-white/10 text-white flex items-center justify-center text-[10px] font-black shadow-lg">
                                                    #{index + 1}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-sm text-white group-hover:text-primary transition-colors truncate">
                                            {leader.username}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <TrendingUp className="w-3 h-3 text-primary/50" />
                                            <span className="text-[10px] font-black text-primary/50 uppercase tracking-widest">{leader.totalLikes} Points</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-white/5 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                            {likesLeaderboard.length === 0 && (
                                <div className="p-10 text-center space-y-4">
                                    <Activity className="w-8 h-8 text-white/5 mx-auto" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 italic">No community activity detected</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Community Stats or similar if needed */}
                    <div className="glass-panel rounded-[2rem] p-8 border border-primary/10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Community Stats</h4>
                                <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em]">Activity</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/2 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Global Posts</p>
                                <p className="text-xl font-display font-black text-white italic">{posts.length}</p>
                            </div>
                            <div className="p-4 bg-white/2 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Active Members</p>
                                <p className="text-xl font-display font-black text-white italic">{likesLeaderboard.length}</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default Feeds;
