import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

function Home() {
  const [user, setUser] = useState(null);
  const [riotAccount, setRiotAccount] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchRegion, setSearchRegion] = useState('euw1');
  const [searchError, setSearchError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRiotAccount(userData.riotAccount || null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      setSearchError('Please enter a Riot ID');
      return;
    }

    if (!searchInput.includes('#')) {
      setSearchError('Please use format: name#tag');
      return;
    }

    setSearchError('');
    
    navigate(`/summoner?search=${encodeURIComponent(searchInput)}&region=${searchRegion}`);
  };

  const regions = [
    { value: 'euw1', label: 'EUW' },
    { value: 'eun1', label: 'EUNE' },
    { value: 'na1', label: 'NA' },
    { value: 'kr', label: 'KR' },
    { value: 'br1', label: 'BR' },
    { value: 'la1', label: 'LAN' },
    { value: 'la2', label: 'LAS' },
    { value: 'oc1', label: 'OCE' },
    { value: 'ru', label: 'RU' },
    { value: 'tr1', label: 'TR' },
    { value: 'jp1', label: 'JP' }
  ];

  return (
    <div className="home-page">
      {/* Hero Search Section */}
      <section className="hero-search-section">
        <div className="hero-background">
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="gradient-text">Killstreak</span>
            </h1>
            <p className="hero-subtitle">
              Advanced League of Legends statistics and teammate finder
            </p>
            
            {/* Main Search Form */}
            <form onSubmit={handleSearch} className="search-form-large">
              <div className="search-input-group">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter Riot ID (name#tag)"
                  className="search-input"
                  required
                />
                <select 
                  value={searchRegion} 
                  onChange={(e) => setSearchRegion(e.target.value)}
                  className="region-select"
                >
                  {regions.map(region => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
                <button type="submit" className="search-button">
                  Search
                </button>
              </div>
              {searchError && <div className="search-error">{searchError}</div>}
            </form>
          </div>
        </div>
      </section>

      {/* User Profile Section */}
      {user && riotAccount && (
        <section className="user-profile-section">
          <div className="container">
            <h2 className="section-title">Your Profile</h2>
            <div className="user-profile-card">
              <div className="profile-header">
                <img 
                  src={`https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/${riotAccount.profileIconId}.png`}
                  alt="Profile"
                  className="profile-avatar"
                />
                <div className="profile-info">
                  <h3>{riotAccount.gameName}#{riotAccount.tagLine}</h3>
                  <p className="profile-level">Level {riotAccount.summonerLevel}</p>
                  <p className="profile-region">{riotAccount.region.toUpperCase()}</p>
                </div>
              </div>
              <div className="profile-actions">
                <Link to="/profile" className="profile-action-btn">
                  View Full Profile
                </Link>
                <Link to="/summoner" className="profile-action-btn secondary">
                  Search Players
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Use Killstreak?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Player Search</h3>
              <p>Look up any player across all regions with detailed statistics and match history.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Advanced Stats</h3>
              <p>Deep analytics including champion mastery and win rates.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Find Teammates</h3>
              <p>Find players to play with in any gamemode and have fun.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Social Features</h3>
              <p>Chat with friends and share your achievements.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Improve Your Game?</h2>
            <p>Join thousands of players using Killstreak to track their progress and find teammates.</p>
            <div className="cta-actions">
              {!user ? (
                <>
                  <Link to="/register" className="cta-button primary">
                    Get Started
                  </Link>
                  <Link to="/summoner" className="cta-button secondary">
                    Browse Players
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/summoner" className="cta-button primary">
                    Search Players
                  </Link>
                  <Link to="/queue" className="cta-button secondary">
                    Find Teammates
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;