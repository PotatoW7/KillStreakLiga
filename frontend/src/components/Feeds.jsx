import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import ProfilePosts from "./ProfilePosts";
import "../styles/componentsCSS/Feeds.css";

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

    const getRankIcon = (tier) => {
        if (!tier) return "/rank-icons/Rank=Unranked.png";
        return `/rank-icons/Rank=${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}.png`;
    };

    if (!user) {
        return (
            <div className="feeds-page">
                <div className="feeds-container single-col">
                    <div className="auth-message">
                        <h2>Welcome to Feeds</h2>
                        <p>Join the community to share your highlights, find teammates, and stay updated.</p>
                        <button onClick={() => window.location.href = "/"} className="login-btn">Log In to Participate</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="feeds-page">
            <div className="feeds-layout">
                <main className="feeds-main">
                    <div className="feeds-hero">
                        <h1>Community Feed</h1>
                        <p>Share your journey and connect with other summoners</p>
                    </div>

                    <div className="feed-controls">
                        <div className="feed-tabs">
                            <button
                                className={`feed-tab ${activeTab === 'recent' ? 'active' : ''}`}
                                onClick={() => setActiveTab('recent')}
                            >
                                Recent
                            </button>
                            <button
                                className={`feed-tab ${activeTab === 'trending' ? 'active' : ''}`}
                                onClick={() => setActiveTab('trending')}
                            >
                                Top Posts
                            </button>
                        </div>
                        <div className="feed-search">
                            <input
                                type="text"
                                placeholder="Search posts or users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-posts">
                            <div className="loader"></div>
                            <p>Loading the latest updates...</p>
                        </div>
                    ) : (
                        <div className="feed-content">
                            <ProfilePosts
                                user={user}
                                profileImage={profileImage}
                                posts={filteredPostsBySearch}
                                isOwnProfile={true}
                                onPostCreated={() => { }}
                            />
                        </div>
                    )}
                </main>

                <aside className="feeds-sidebar">
                    <div className="sidebar-section likes-leaderboard">
                        <div className="section-header">
                            <h3>Likes Leaderboard</h3>
                            <div className="section-icon-container">
                                <img src="/project-icons/Feeds icons/leaderboard.png" alt="" className="section-icon-img" />
                            </div>
                        </div>
                        <p className="section-subtitle">Most engaged summoners</p>
                        <div className="leaderboard-list">
                            {likesLeaderboard.map((leader, index) => (
                                <div key={leader.userId} className="leader-card" onClick={() => window.location.href = `/profile/${leader.userId}`}>
                                    <div className="leader-rank-box">
                                        <span className={`rank-num rank-${index + 1}`}>#{index + 1}</span>
                                    </div>
                                    <img src={leader.profileImage} alt="" className="leader-avatar" />
                                    <div className="leader-info">
                                        <span className="leader-name">{leader.username}</span>
                                        <div className="leader-stats">
                                            <span className="like-count">{leader.totalLikes}</span>
                                            <span className="like-label">Likes Received</span>
                                        </div>
                                    </div>
                                    <div className="leader-medal">
                                        {index === 0 && <img src="/project-icons/Feeds icons/medal first.png" alt="First" className="medal-icon-img" />}
                                        {index === 1 && <img src="/project-icons/Feeds icons/medal second.png" alt="Second" className="medal-icon-img" />}
                                        {index === 2 && <img src="/project-icons/Feeds icons/medal third.png" alt="Third" className="medal-icon-img" />}
                                    </div>
                                </div>
                            ))}
                            {likesLeaderboard.length === 0 && (
                                <p className="no-data">No interactions yet.</p>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default Feeds;
