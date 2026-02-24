import React, { useEffect } from 'react';
import { useNavigate } from "react-router-dom";

const FAQ = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        { id: 'what-is-rifthub', title: 'Neural Overview' },
        { id: 'is-it-free', title: 'Resource Allocation' },
        { id: 'riot-games', title: 'Synchronization' },
        { id: 'coaching', title: 'Strategic Training' },
        { id: 'data-accuracy', title: 'Signal Integrity' },
        { id: 'account', title: 'Node Authentication' }
    ];

    return (
        <div className="min-h-screen pt-32 pb-24 px-6">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
                {/* Navigation Map */}
                <aside className="lg:w-64 shrink-0">
                    <div className="glass-panel rounded-2xl p-6 sticky top-32 border-primary/10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1 h-3 bg-primary rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic text-primary/70">Logic Base Map</h3>
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
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <button
                                onClick={() => navigate('/contact')}
                                className="w-full px-4 py-3 rounded-xl bg-primary text-black font-black text-[9px] uppercase tracking-widest hover:bg-white transition-all shadow-lg active:scale-95"
                            >
                                Send Signal
                            </button>
                        </div>
                    </div>
                </aside>

                {/* FAQ Content */}
                <main className="flex-1 max-w-4xl space-y-16 animate-in fade-in slide-in-from-right-8 duration-1000">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                            <h1 className="font-display text-4xl lg:text-5xl font-black uppercase tracking-tight text-white italic">Logic Base</h1>
                        </div>
                    </div>

                    <div className="space-y-12 ml-5">
                        <section id="what-is-rifthub" className="scroll-mt-32 space-y-4">
                            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                                <span className="text-primary italic">01.</span> What is Rifthub?
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-widest ml-11">
                                Rifthub is an advanced neural analytics and social synchronization platform for League of Legends aspirants.
                                We provide high-fidelity telemetry for your summoner nodes, comprehensive match histories,
                                and a secure marketplace to connect with elite tactical coaches.
                            </p>
                        </section>

                        <section id="is-it-free" className="scroll-mt-32 space-y-4">
                            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                                <span className="text-primary italic">02.</span> Is it free?
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-widest ml-11">
                                Affirmative. Accessing neural telemetry, viewing historical combat records, and utilizing our analytical tools
                                requires no resource credits. We do not charge for access to data retrieved via the Riot Games interface.
                            </p>
                        </section>

                        <section id="riot-games" className="scroll-mt-32 space-y-4">
                            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                                <span className="text-primary italic">03.</span> Is it official?
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-widest ml-11">
                                Negative. Rifthub.lol is an independent entity. We are not endorsed by Riot Games
                                and do not reflect the views or directives of Riot Games or its authorized operators.
                            </p>
                        </section>

                        <section id="coaching" className="scroll-mt-32 space-y-4">
                            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                                <span className="text-primary italic">04.</span> How does training work?
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-widest ml-11">
                                Tactical instructors list their services on the marketplace. Aspirants can analyze and book
                                training protocols to enhance their combat efficiency. Rifthub facilitates the synchronization;
                                specific training parameters are handled between instructor and student.
                            </p>
                        </section>

                        <section id="data-accuracy" className="scroll-mt-32 space-y-4">
                            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                                <span className="text-primary italic">05.</span> Signal accuracy?
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-widest ml-11">
                                We intercept telemetry directly from official Riot Games endpoints. While we strive for absolute
                                synchronization, minor signal delays may occur during interface maintenance or system updates.
                            </p>
                        </section>

                        <section id="account" className="scroll-mt-32 space-y-4">
                            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                                <span className="text-primary italic">06.</span> Authentication?
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-widest ml-11">
                                Basic telemetry lookup and combat records do not require authentication. However,
                                node registration allows you to persist your profile, synchronize with the community
                                feed, and initiate training protocols.
                            </p>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default FAQ;
