import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ChevronDown } from 'lucide-react';

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
    { value: 'jp1', label: 'JP' },
    { value: 'ph2', label: 'PH' },
    { value: 'sg2', label: 'SG' },
    { value: 'th2', label: 'TH' },
    { value: 'tw2', label: 'TW' },
    { value: 'vn2', label: 'VN' },
    { value: 'me1', label: 'ME' }
  ];

  return (
    <div className="home-page">

      <section className="hero-section">
        <div className="hero-glow-primary" />
        <div className="hero-glow-accent" />

        <div className="hero-content">
          <div className="beta-badge">
            <span>Beta</span>
          </div>

          <h1 className="hero-title">
            DOMINATE<br />THE RIFT
          </h1>

          <p className="hero-desc">
            The ultimate League of Legends companion. Track stats, find duo partners, and learn from the best coaches.
          </p>

          <form onSubmit={handleSearch} className="hero-search-form glass-panel">
            <div className="search-input-wrapper">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Riot ID (name#tag)"
                className="search-input"
                required
              />
            </div>
            <div className="search-controls">
              <div className="region-select-wrapper">
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
                <div className="region-chevron">
                  <ChevronDown />
                </div>
              </div>
              <button type="submit" className="search-submit">
                SEARCH
              </button>
            </div>
          </form>
          {searchError && <div className="search-error">{searchError}</div>}
        </div>
      </section>


      {user && riotAccount && (
        <section className="account-banner">
          <div className="account-banner-inner glass-panel">
            <div className="account-banner-gradient" />
            <div className="account-banner-content">
              <div className="account-info">
                <div className="account-avatar-wrapper">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/${riotAccount.profileIconId}.png`}
                    alt="Profile"
                    className="account-avatar"
                  />
                  <div className="account-level-badge">
                    {riotAccount.summonerLevel}
                  </div>
                </div>
                <div>
                  <h2 className="account-name">{riotAccount.gameName}#{riotAccount.tagLine}</h2>
                  <p className="account-region">{riotAccount.region.toUpperCase()} Region</p>
                </div>
              </div>
              <div className="account-actions">
                <Link to="/profile" className="btn-secondary">Show Stats</Link>
                <Link to="/summoner" className="btn-outline">Inspect Rift</Link>
                <Link to="/queue" className="btn-primary">Find Duo</Link>
              </div>
            </div>
          </div>
        </section>
      )}


      <section className="features-section">
        <div className="features-header">
          <h2>Level Up Your Game</h2>
          <div className="features-header-line" />
        </div>
        <div className="features-grid">
          <FeatureCard
            icon="/project-icons/Home icons/player search.png"
            title="Player Search"
            desc="Look up any player across all regions with detailed statistics and match history."
          />
          <FeatureCard
            icon="/project-icons/Home icons/statistics.png"
            title="Advanced Stats"
            desc="Deep analytics including champion mastery and win rates for every game."
          />
          <FeatureCard
            icon="/project-icons/Home icons/teammates.png"
            title="Find Teammates"
            desc="Find players to play with in any gamemode and have fun on the rift."
          />
          <FeatureCard
            icon="/project-icons/Home icons/socialChat.png"
            title="Social Features"
            desc="Chat with friends in real-time and share your recent achievements."
          />
          <FeatureCard
            icon="/project-icons/Home icons/coaching.png"
            title="Pro Coaching"
            desc="Learn from verified high-rank coaches and improve your mechanical skills."
          />
        </div>
      </section>


      <section className="cta-section">
        <div className="cta-inner glass-panel">
          <div className="cta-glow" />
          <h2>READY TO CLIMB?</h2>
          <p className="cta-desc">
            Join thousands of players using Rifthub to track their progress and find teammates.
          </p>
          <div className="cta-buttons">
            {!user ? (
              <>
                <Link to="/register" className="btn-cta-primary">Get Started</Link>
                <Link to="/summoner" className="btn-cta-outline">Browse Players</Link>
              </>
            ) : (
              <>
                <Link to="/summoner" className="btn-cta-primary">Search Players</Link>
                <Link to="/coaching" className="btn-cta-outline">Find a Coach</Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="feature-card glass-panel">
      <div className="feature-card-icon">
        <img src={icon} alt={title} />
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

export default Home;