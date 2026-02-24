import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="w-full mt-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            <div className="max-w-7xl mx-auto px-8 py-16 relative">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
                    <div className="space-y-6 max-w-sm">
                        <div className="flex flex-col gap-2">
                            <div className="font-display font-black text-3xl tracking-tighter text-white">
                                RIFTHUB<span className="text-primary italic">.LOL</span>
                            </div>
                        </div>
                        <p className="max-w-4xl text-[9px] font-medium text-muted-foreground/30 leading-relaxed uppercase tracking-[0.2em] italic">
                            Rifthub.lol is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Resources</h4>
                            <div className="flex flex-col gap-3">
                                <FooterLink to="/legal">Legal Information</FooterLink>
                                <FooterLink to="/tos">Terms of Service</FooterLink>
                                <FooterLink to="/privacy">Privacy Policy</FooterLink>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Support and Contact</h4>
                            <div className="flex flex-col gap-3">
                                <FooterLink to="/contact">Support and Contact</FooterLink>
                                <FooterLink to="/faq">FAQ</FooterLink>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

function FooterLink({ to, children }) {
    return (
        <Link
            to={to}
            className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-all flex items-center gap-2 group"
        >
            <div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-primary transition-colors" />
            {children}
        </Link>
    );
}

export default Footer;
