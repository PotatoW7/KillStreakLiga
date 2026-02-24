import React, { useEffect } from 'react';

const Legal = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen pt-24 pb-16 px-4">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                    <div>
                        <h1 className="font-display text-3xl font-black uppercase tracking-[0.2em] italic text-white">Legal Information</h1>
                    </div>
                </div>
                <div className="glass-panel rounded-3xl p-8 sm:p-12 space-y-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    <section className="relative space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-4 bg-primary/50 rounded-full" />
                            <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">General Information</h2>
                        </div>
                        <div className="space-y-4 text-sm font-medium text-muted-foreground leading-relaxed">
                            <p>
                            </p>
                            <p className="bg-white/2 p-6 rounded-2xl border border-white/5 italic">
                                Rifthub.lol is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
                            </p>
                        </div>
                    </section>

                    <section id="trademarks" className="relative space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-4 bg-primary/50 rounded-full" />
                            <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">Trademarks</h2>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                            League of Legends™ and Riot Games® are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc. All other trademarks are the property of their respective owners.
                        </p>
                    </section>

                    <section id="data-usage" className="relative space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-4 bg-primary/50 rounded-full" />
                            <h2 className="text-sm font-black uppercase tracking-widest italic text-white/90">Data Transmission</h2>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                            Rifthub.lol utilizes the Riot Games Global API. We maintain strict compliance with Riot's policies regarding data usage and intellectual property rights. Information retrieved through this interface is intended for personal, non-commercial use to optimize user knowledge and skill development.
                        </p>
                    </section>
                </div>

                <div className="text-center opacity-20 invisible">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em]">End of Page</p>
                </div>
            </div>
        </div>
    );
};

export default Legal;
