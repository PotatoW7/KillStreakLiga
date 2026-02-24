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
    <div className="flex flex-col items-center min-h-screen">

      <section className="w-full relative overflow-hidden flex flex-col items-center justify-center min-h-[70vh] py-24 px-4 text-center">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/4 right-[10%] w-[300px] h-[300px] bg-accent/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-8 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-primary">Beta</span>
          </div>

          <h1 className="font-display text-6xl md:text-9xl font-black tracking-tighter mb-8 leading-[0.9] text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-in fade-in slide-in-from-bottom-4 duration-1000">
            DOMINATE<br />THE RIFT
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            The ultimate League of Legends companion. Track stats, find duo partners, and learn from the best coaches.
          </p>

          <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto glass-panel rounded-full p-2 flex flex-col md:flex-row items-stretch md:items-center shadow-2xl shadow-primary/10 group focus-within:shadow-primary/25 transition-all duration-500 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400">
            <div className="flex-1 flex items-center px-6 py-2 md:py-0">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Riot ID (name#tag)"
                className="w-full border-0 bg-transparent focus:ring-0 text-xl font-medium placeholder:text-muted-foreground/30 h-12 text-foreground outline-none"
                required
              />
            </div>
            <div className="flex items-center gap-2 p-1 border-t md:border-t-0 md:border-l border-border/40">
              <div className="relative group/select">
                <select
                  value={searchRegion}
                  onChange={(e) => setSearchRegion(e.target.value)}
                  className="appearance-none bg-transparent border-0 text-muted-foreground font-black pl-4 pr-10 py-2 focus:ring-0 cursor-pointer hover:text-primary transition-all uppercase tracking-wider text-xs outline-none"
                >
                  {regions.map(region => (
                    <option key={region.value} value={region.value} className="bg-neutral-900 text-white">
                      {region.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/30 group-hover/select:text-primary transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-white hover:text-black px-10 py-4 rounded-full font-black text-lg transition-all active:scale-95 shadow-xl shadow-primary/20 whitespace-nowrap"
              >
                SEARCH
              </button>
            </div>
          </form>
          {searchError && <div className="mt-4 text-red-500 font-bold text-sm bg-red-500/10 py-2 px-4 rounded-full inline-block border border-red-500/20">{searchError}</div>}
        </div>
      </section>


      {user && riotAccount && (
        <section className="w-full max-w-7xl px-4 py-12">
          <div className="glass-panel p-8 rounded-3xl border-primary/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/${riotAccount.profileIconId}.png`}
                    alt="Profile"
                    className="w-24 h-24 rounded-2xl border-2 border-primary shadow-2xl shadow-primary/20"
                  />
                  <div className="absolute -bottom-3 -right-3 bg-primary text-black font-black text-xs px-3 py-1.5 rounded-lg shadow-xl">
                    {riotAccount.summonerLevel}
                  </div>
                </div>
                <div>
                  <h2 className="font-display text-3xl font-bold mb-1">{riotAccount.gameName}#{riotAccount.tagLine}</h2>
                  <p className="text-primary font-bold tracking-widest text-xs uppercase">{riotAccount.region.toUpperCase()} Region</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/profile" className="px-8 py-3 rounded-xl bg-secondary text-foreground hover:bg-primary hover:text-black font-bold transition-all">
                  Show Stats
                </Link>
                <Link to="/summoner" className="px-8 py-3 rounded-xl border border-border hover:border-primary text-foreground font-bold transition-all">
                  Inspect Rift
                </Link>
                <Link to="/queue" className="px-8 py-3 rounded-xl bg-primary text-black font-bold hover:bg-white transition-all shadow-lg shadow-primary/10">
                  Find Duo
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}


      <section className="w-full max-w-7xl px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Level Up Your Game</h2>
          <div className="w-20 h-1 bg-primary mx-auto rounded-full" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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


      <section className="w-full max-w-5xl mx-auto px-4 py-24">
        <div className="glass-panel p-16 rounded-[3rem] text-center border-accent/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[80px] -z-10" />
          <h2 className="font-display text-4xl md:text-6xl font-black mb-6">READY TO CLIMB?</h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto underline-offset-4 decoration-primary/50">
            Join thousands of players using Rifthub to track their progress and find teammates.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {!user ? (
              <>
                <Link to="/register" className="px-12 py-5 rounded-full bg-primary text-black font-bold text-xl hover:bg-white transition-all shadow-xl shadow-primary/20">
                  Get Started
                </Link>
                <Link to="/summoner" className="px-12 py-5 rounded-full border border-border hover:border-primary text-foreground font-bold text-xl transition-all">
                  Browse Players
                </Link>
              </>
            ) : (
              <>
                <Link to="/summoner" className="px-12 py-5 rounded-full bg-primary text-black font-bold text-xl hover:bg-white transition-all shadow-xl shadow-primary/20">
                  Search Players
                </Link>
                <Link to="/coaching" className="px-12 py-5 rounded-full border border-border hover:border-primary text-foreground font-bold text-xl transition-all">
                  Find a Coach
                </Link>
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
    <div className="glass-panel p-10 rounded-[2rem] hover:-translate-y-2 transition-all duration-500 group border-white/5 hover:border-primary/20 bg-background/40">
      <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-8 border border-white/5 group-hover:bg-primary/10 transition-colors group-hover:scale-110 duration-500">
        <img src={icon} alt={title} className="w-12 h-12 object-contain" />
      </div>
      <h3 className="font-display text-2xl font-bold mb-4 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {desc}
      </p>
    </div>
  );
}

export default Home;