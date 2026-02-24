import React, { useEffect } from 'react';

const PrivacyPolicy = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        { id: "introduction", title: "1. Introduction" },
        { id: "data-collection", title: "2. Data Collection" },
        { id: "riot-api", title: "3. API Integration" },
        { id: "cookies", title: "4. Cookies" },
        { id: "data-usage", title: "5. Data Usage" },
        { id: "data-protection", title: "6. Security" },
        { id: "third-parties", title: "7. External Partners" },
        { id: "contact", title: "8. Support" }
    ];

    return (
        <div className="min-h-screen pt-24 pb-16 px-4">
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">


                <aside className="lg:w-64 shrink-0">
                    <div className="glass-panel rounded-2xl p-6 sticky top-24 border-primary/10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1 h-3 bg-primary rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic text-primary/70">Contents</h3>
                        </div>
                        <nav>
                            <ul className="space-y-1">
                                {sections.map(section => (
                                    <li key={section.id}>
                                        <a
                                            href={`#${section.id}`}
                                            className="block px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all"
                                        >
                                            {section.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </aside>


                <main className="flex-1 space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                        <div>
                            <h1 className="font-display text-3xl font-black uppercase tracking-[0.2em] italic text-white">Privacy Policy</h1>
                        </div>
                    </div>

                    <div className="glass-panel rounded-3xl p-8 sm:p-12 space-y-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 opacity-30" />

                        <section id="introduction" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">1. Introduction</h2>
                            </div>
                            <div className="space-y-4 text-sm font-medium text-muted-foreground leading-relaxed">
                                <p>Welcome to <span className="text-white font-bold">Rifthub.lol</span>. Your privacy is of paramount importance to us. This Privacy Policy outlines the types of information we collect, how we use it, and the security measures to ensure your personal data remains protected and compliant with industry standards.</p>
                                <p>Use of Rifthub.lol acknowledges consent to the data practices described in this policy.</p>
                            </div>
                        </section>

                        <section id="data-collection" className="scroll-mt-28 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">2. Data Collection</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white/2 p-6 rounded-2xl border border-white/5 space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary italic">A. Personal Information</h3>
                                    <p className="text-xs text-muted-foreground mb-4">During account registration, we collect:</p>
                                    <ul className="grid sm:grid-cols-2 gap-2">
                                        {["Email address", "Profile preferences", "Profile biography", "Uploaded profile images"].map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-[11px] font-medium text-white/70">
                                                <div className="w-1 h-1 rounded-full bg-primary/50" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-white/2 p-6 rounded-2xl border border-white/5 space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary italic">B. Automated Data Collection</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        We automatically collect log information during site access, including IP address, browser type, and operating system, to optimize user experience and maintain system security.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section id="riot-api" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">3. Riot API Integration</h2>
                            </div>
                            <div className="space-y-4 text-sm font-medium text-muted-foreground leading-relaxed">
                                <p>Rifthub.lol utilizes the official Riot Games API to retrieve and display League of Legends player data, match history, and game information.</p>
                                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 italic">
                                    <p className="font-black text-[10px] uppercase tracking-widest text-primary mb-2">Service Notice:</p>
                                    <p>All data retrieved via this integration is accessed through official Riot Games channels. We do not charge for access. Use of this data is strictly informational, intended for performance analysis and community interaction.</p>
                                </div>
                            </div>
                        </section>

                        <section id="cookies" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">4. Cookies & Tracking</h2>
                            </div>
                            <div className="space-y-4 text-sm font-medium text-muted-foreground leading-relaxed">
                                <p>We use cookies to personalize your experience. These are small data files stored on your device to facilitate site functionality.</p>
                                <div className="grid sm:grid-cols-3 gap-4">
                                    {[
                                        { title: "Authentication", desc: "Maintains your session connection." },
                                        { title: "Preferences", desc: "Remembers your settings." },
                                        { title: "Analytics", desc: "Optimizes site performance." }
                                    ].map((chip, i) => (
                                        <div key={i} className="p-4 rounded-xl bg-white/2 border border-white/5">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1 italic">{chip.title}</p>
                                            <p className="text-[10px] text-muted-foreground/60 leading-tight">{chip.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] text-muted-foreground italic">Disabling cookies may affect certain features of the site.</p>
                            </div>
                        </section>

                        <section id="data-usage" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">5. Data Usage</h2>
                            </div>
                            <ul className="space-y-2">
                                {[
                                    "Maintain and improve service quality",
                                    "Facilitate the coaching marketplace",
                                    "Keep you signed in your account"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/2 border border-white/5 text-xs font-medium text-muted-foreground hover:bg-white/5 transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shadow-[0_0_5px_rgba(234,179,8,0.2)]" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section id="data-protection" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">6. Security & Data Protection</h2>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                We implement rigorous security measures to maintain the safety of your information. Your data is stored behind secured networks and is only accessible by a limited number of administrators with special access rights.
                            </p>
                        </section>

                        <section id="third-parties" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">7. Third-Party Services</h2>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                We do not sell or trade your personally identifiable information. Rifthub.lol utilizes <span className="text-white font-bold">Google Firebase</span> for authentication and database services. Refer to their Privacy Policy for further details.
                            </p>
                        </section>

                        <section id="contact" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">8. Support</h2>
                            </div>
                            <div className="p-6 rounded-2xl bg-white/2 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Support Email:</p>
                                    <p className="text-sm font-bold text-primary">rifthubofficial@gmail.com</p>
                                </div>
                                <a
                                    href="mailto:rifthubofficial@gmail.com"
                                    className="px-6 py-2 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg"
                                >
                                    Contact Support
                                </a>
                            </div>
                        </section>
                    </div>

                    <div className="text-center opacity-20">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em]">End of Policy</p>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
