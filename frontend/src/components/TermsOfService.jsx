import React, { useEffect } from 'react';

const TermsOfService = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        { id: "acceptance", title: "1. Acceptance" },
        { id: "description", title: "2. Service Overview" },
        { id: "riot-data", title: "3. Riot Data" },
        { id: "user-accounts", title: "4. User Account" },
        { id: "prohibited", title: "5. Restrictions" },
        { id: "boosting-warning", title: "6. Warning" },
        { id: "intellectual", title: "7. Property" },
        { id: "disclaimer", title: "8. Warranties" },
        { id: "limitation", title: "9. Liability" },
        { id: "contact", title: "10. Contact" }
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
                            <h1 className="font-display text-3xl font-black uppercase tracking-[0.2em] italic text-white">Terms of Service</h1>
                        </div>
                    </div>

                    <div className="glass-panel rounded-3xl p-8 sm:p-12 space-y-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 opacity-30" />

                        <section id="acceptance" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">1. Acceptance of Terms</h2>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                By accessing or using <span className="text-white font-bold">Rifthub.lol</span> (the "Platform"), you formally agree to comply with and be bound by these Terms of Service. Access to the platform implies total acceptance of these terms.
                            </p>
                        </section>

                        <section id="description" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">2. Service Overview</h2>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                Rifthub.lol provides League of Legends analytics, match history, and a peer-to-peer coaching marketplace. We provide in-depth data and community features to the user base.
                            </p>
                        </section>

                        <section id="riot-data" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">3. Riot Data Integration</h2>
                            </div>
                            <div className="space-y-4 text-sm font-medium text-muted-foreground leading-relaxed">
                                <p>Data is retrieved via the Riot Games Global API. Rifthub maintains no official affiliation with Riot Games, Inc.</p>
                                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                                    <p className="font-black text-[10px] uppercase tracking-widest text-primary mb-2 italic">Data Access Policy:</p>
                                    <p className="italic">All data retrieved from the Riot Games API is distributed to the user base at no cost. Rifthub prohibits the sale of raw data or basic summoner statistics.</p>
                                </div>
                            </div>
                        </section>

                        <section id="user-accounts" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">4. User Account Registration</h2>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                Advanced site features require account registration. Users maintain full responsibility for their account's security and all activity made under their account. We reserve the right to delete any account violating community guidelines.
                            </p>
                        </section>

                        <section id="prohibited" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">5. Prohibited conduct</h2>
                            </div>
                            <ul className="grid sm:grid-cols-2 gap-3">
                                {[
                                    "Impersonation"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 p-3 rounded-xl bg-white/2 border border-white/5 text-xs font-medium text-muted-foreground">
                                        <div className="w-1 h-1 rounded-full bg-primary" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section id="boosting-warning" className="scroll-mt-28 space-y-4">
                            <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-red-500/20 transition-all" />
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-1 h-4 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                    <h2 className="text-sm font-black uppercase tracking-widest italic text-red-500">6. Boosting Warning</h2>
                                </div>
                                <div className="space-y-4 text-sm font-medium text-muted-foreground leading-relaxed">
                                    <p className="text-white font-bold">Boosting is strictly forbidden by Riot Games and will result in Account Suspension.</p>
                                    <p>Rifthub facilitates player development and learning only. Facilitating or requesting boosting services via this site will result in a <span className="text-red-500 font-black italic">Permanent Ban</span>. Engaging in unauthorized account activity is at your own risk.</p>
                                </div>
                            </div>
                        </section>

                        <section id="intellectual" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">7. Intellectual Property</h2>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                All original content, site design, and architectural code on Rifthub.lol remain exclusive property of Rifthub. League of Legends items are subject to Riot Games, Inc. ownership.
                            </p>
                        </section>

                        <section id="disclaimer" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">8. Disclaimer of Warranties</h2>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                                This site is provided "AS IS". Rifthub disclaims all warranties, including implied merchantability or fitness for specific performance targets. No specific outcome is guaranteed.
                            </p>
                        </section>

                        <section id="limitation" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">9. Limitation of Liability</h2>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                Rifthub systems shall not be liable for any data loss, profit degradation, or business interruption arising from site use or disconnection.
                            </p>
                        </section>

                        <section id="contact" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary/50 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">10. Support</h2>
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
                                    Send Inquiry
                                </a>
                            </div>
                        </section>
                    </div>

                    <div className="text-center opacity-20">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em]">End of Terms</p>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TermsOfService;
