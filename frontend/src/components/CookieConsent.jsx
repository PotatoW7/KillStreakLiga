import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const checkConsent = async () => {
            const consent = localStorage.getItem('rifthub_cookie_consent');

            if (consent) {
                try {
                    const parsedConsent = JSON.parse(consent);
                    if (parsedConsent.essential) {
                        await setPersistence(auth, browserLocalPersistence);
                    } else {
                        await setPersistence(auth, browserSessionPersistence);
                    }
                } catch (error) {
                    console.error("Error setting persistence:", error);
                    await setPersistence(auth, browserSessionPersistence);
                }
            } else {
                await setPersistence(auth, browserSessionPersistence);
                setIsVisible(true);
            }
        };

        checkConsent();
    }, []);

    const handleAcceptAll = async () => {
        const newPreferences = { essential: true };
        localStorage.setItem('rifthub_cookie_consent', JSON.stringify(newPreferences));

        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch (error) {
            console.error("Error enabling persistent auth:", error);
        }

        setIsVisible(false);
    };

    const handleDeclineAll = async () => {
        const newPreferences = { essential: false };
        localStorage.setItem('rifthub_cookie_consent', JSON.stringify(newPreferences));

        try {
            await setPersistence(auth, browserSessionPersistence);
        } catch (error) {
            console.error("Error enforcing session auth:", error);
        }

        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 z-[100] w-full max-w-lg p-6 pointer-events-none">
            <div className="glass-panel rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-primary/20 pointer-events-auto animate-in slide-in-from-left-10 duration-1000 relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-1000" />
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl opacity-20" />

                <div className="relative space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(234,179,8,0.4)]" />
                                <h2 className="font-display text-xl font-black uppercase tracking-widest italic text-white">Privacy Protocol</h2>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic ml-3.5">System Identifier: [RHS-PRIV-01]</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {!showSettings ? (
                            <p className="text-[11px] font-medium text-muted-foreground/80 leading-relaxed uppercase tracking-[0.1em] ml-3.5">
                                Rifthub utilizes memory segments to optimize your neural connection.
                                Authorizing these protocols ensures <span className="text-primary font-bold italic">Persistence</span> across signal sessions.
                            </p>
                        ) : (
                            <div className="ml-3.5 space-y-4 animate-in fade-in duration-500">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group/item">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">Essential Matrix</p>
                                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Required for signal security & node status.</p>
                                    </div>
                                    <div className="w-8 h-4 bg-primary/20 rounded-full relative flex items-center px-1">
                                        <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(234,179,8,0.6)]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 ml-3.5 pt-2">
                        {!showSettings ? (
                            <>
                                <button
                                    className="px-8 py-2.5 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white transition-all shadow-lg shadow-primary/10 active:scale-95"
                                    onClick={handleAcceptAll}
                                >
                                    Authorize Signal
                                </button>
                                <button
                                    className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white hover:border-white/20 transition-all"
                                    onClick={() => setShowSettings(true)}
                                >
                                    Intel
                                </button>
                                <button
                                    className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 hover:text-red-400 transition-all ml-auto"
                                    onClick={handleDeclineAll}
                                >
                                    Decline
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="flex-1 px-8 py-2.5 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white transition-all shadow-lg active:scale-95"
                                    onClick={handleAcceptAll}
                                >
                                    Save Directive
                                </button>
                                <button
                                    className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white transition-all"
                                    onClick={() => setShowSettings(false)}
                                >
                                    Back
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
