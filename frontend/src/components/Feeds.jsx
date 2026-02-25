import React, { useEffect, useState } from "react";
import { auth, db, rtdb } from "../firebase";
import { collection, query, onSnapshot, getDoc, doc } from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import ProfilePosts from "./ProfilePosts";
import { Award, TrendingUp, Clock, Search, ChevronDown, Users, Bell, Zap, Activity, Lock, ChevronRight } from "lucide-react";

const normalizeProfileIcon = (url) => {
    if (!url) return url;
    if (typeof url !== 'string') return url;
    if (url.includes('profileicon/588.png')) {
        return 'https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png';
    }
    if (url.includes('ddragon.leagueoflegends.com/cdn/13.20.1/')) {
        return url.replace('13.20.1', '14.3.1');
    }
    return url;
};

function Feeds() {
    const [user, setUser] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [posts, setPosts] = useState([]);
    const [liveProfileImages, setLiveProfileImages] = useState({});
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
                            profileImage: post.userProfileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png",
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
            const uniqueAuthorIds = [...new Set(filteredPosts.map(p => p.userId).filter(Boolean))];
            const enrichPostsAndLeaderboard = async () => {
                const liveMap = {};
                await Promise.all(uniqueAuthorIds.map(async (authorId) => {
                    try {
                        const authorDoc = await getDoc(doc(db, "users", authorId));
                        if (authorDoc.exists()) {
                            liveMap[authorId] = normalizeProfileIcon(authorDoc.data().profileImage) || null;
                        }
                    } catch (err) {
                        console.error("Error fetching live author data:", err);
                    }
                }));
                setLiveProfileImages(liveMap);

                const enriched = await Promise.all(leaderboard.map(async (entry) => {
                    if (liveMap[entry.userId]) {
                        return {
                            ...entry,
                            profileImage: liveMap[entry.userId]
                        };
                    }
                    try {
                        const userDoc = await getDoc(doc(db, "users", entry.userId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            return {
                                ...entry,
                                username: userData.username || entry.username,
                                profileImage: normalizeProfileIcon(userData.profileImage) || entry.profileImage
                            };
                        }
                    } catch (err) {
                        console.error("Error fetching live user data for leaderboard:", err);
                    }
                    return { ...entry, profileImage: normalizeProfileIcon(entry.profileImage) };
                }));
                setLikesLeaderboard(enriched);
            };

            enrichPostsAndLeaderboard();

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
        <div className="feeds-page">
            <div className="feeds-layout">
                <main className="feeds-main">
                    <div className="feeds-hero">
                        <div className="feeds-hero-glow" />
                        <div className="feeds-hero-content">
                            <div className="feeds-hero-badge">
                                <Zap className="feeds-hero-badge-icon" />
                                <span className="feeds-hero-badge-text">Live Community Feed</span>
                            </div>
                            <h1 className="feeds-hero-title">
                                COMMUNITY<br /><span className="highlight">FEED</span>
                            </h1>
                            <p className="feeds-hero-desc">
                                Curating community highlights, top discussions, and global RiftHub activity.
                            </p>
                        </div>
                    </div>

                    <div className="feeds-toolbar glass-panel">
                        <div className="feeds-tabs">
                            <button
                                onClick={() => setActiveTab('recent')}
                                className={`feeds-tab ${activeTab === 'recent' ? 'active' : ''}`}
                            >
                                Latest
                            </button>
                            <button
                                onClick={() => setActiveTab('trending')}
                                className={`feeds-tab ${activeTab === 'trending' ? 'active' : ''}`}
                            >
                                Trending
                            </button>
                        </div>

                        <div className="feeds-search-wrapper">
                            <input
                                type="text"
                                placeholder="Search community posts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="feeds-search-input"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="feeds-loading">
                            <div className="feeds-loading-icon-wrapper">
                                <Activity className="feeds-loading-icon" />
                                <div className="feeds-loading-glow" />
                            </div>
                            <p className="feeds-loading-text">Loading Community Feed...</p>
                        </div>
                    ) : (
                        <div className="animate-slide-up-sm">
                            <ProfilePosts
                                user={user}
                                profileImage={profileImage}
                                posts={filteredPostsBySearch}
                                isOwnProfile={true}
                                isFeedsPage={true}
                                liveProfileImages={liveProfileImages}
                                onPostCreated={() => { }}
                            />
                        </div>
                    )}
                </main>

                <aside className="feeds-sidebar">
                    <div className="feeds-leaderboard glass-panel">
                        <div className="feeds-leaderboard-header">
                            <div className="feeds-leaderboard-title-row">
                                <h3 className="feeds-leaderboard-title">TOP PERFORMERS</h3>
                                <img src="/project-icons/Feeds icons/leaderboard.png" alt="" className="feeds-leaderboard-icon" />
                            </div>
                            <p className="feeds-leaderboard-subtitle">Highest Community Engagement</p>
                        </div>
                        <div className="feeds-leaderboard-list">
                            {likesLeaderboard.map((leader, index) => (
                                <button
                                    key={leader.userId}
                                    onClick={() => window.location.href = `/profile/${leader.userId}`}
                                    className="feeds-leader-btn"
                                >
                                    <div className="feeds-leader-avatar-wrapper">
                                        <div className={`feeds-leader-avatar ${index === 0 ? 'first' : ''}`}>
                                            <img src={leader.profileImage} alt="" />
                                        </div>
                                        <div className="feeds-leader-medal">
                                            {index === 0 && <img src="/project-icons/Feeds icons/medal first.png" alt="" />}
                                            {index === 1 && <img src="/project-icons/Feeds icons/medal second.png" alt="" />}
                                            {index === 2 && <img src="/project-icons/Feeds icons/medal third.png" alt="" />}
                                            {index > 2 && (
                                                <div className="feeds-leader-rank-badge">
                                                    #{index + 1}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="feeds-leader-info">
                                        <h4 className="feeds-leader-name">
                                            {leader.username}
                                        </h4>
                                        <div className="feeds-leader-stats">
                                            <span className="feeds-leader-stats-text">{leader.totalLikes} Likes</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="feeds-leader-chevron" />
                                </button>
                            ))}
                            {likesLeaderboard.length === 0 && (
                                <div className="feeds-leaderboard-empty">
                                    <Activity className="feeds-leaderboard-empty-icon" />
                                    <p className="feeds-leaderboard-empty-text">No community activity detected</p>
                                </div>
                            )}
                        </div>
                    </div>

                </aside>
            </div>
        </div>
    );
}

export default Feeds;
