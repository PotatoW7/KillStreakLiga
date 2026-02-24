import React from 'react';
import { useNavigate } from "react-router-dom";

const Contact = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen pt-32 pb-16 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="glass-panel rounded-[2.5rem] p-12 lg:p-16 border-primary/20 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    {/* Background Accents */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 opacity-20" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-2xl -ml-32 -mb-32 opacity-10" />

                    <div className="relative space-y-12">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                                <h1 className="font-display text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-none italic">Contact Us</h1>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/50 italic ml-5">Get in touch with the Rifthub support team.</p>
                        </div>

                        <div className="space-y-8 ml-5 max-w-2xl">
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-wider">
                                Having issues or need help? Send us an email and our team will get back to you within
                                <span className="text-primary italic font-bold"> 24 hours</span>.
                            </p>

                            <div className="group relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-transparent rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                                <div className="relative glass-panel rounded-2xl p-8 border-white/5 bg-black/40">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                        <div className="space-y-1">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70 italic">Email Address</h3>
                                            <a
                                                href="mailto:rifthubofficial@gmail.com"
                                                className="text-xl lg:text-2xl font-black text-white hover:text-primary transition-all tracking-tight selection:bg-primary selection:text-black"
                                            >
                                                rifthubofficial@gmail.com
                                            </a>
                                        </div>
                                        <button
                                            onClick={() => window.location.href = "mailto:rifthubofficial@gmail.com"}
                                            className="px-8 py-3 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg active:scale-95 shrink-0"
                                        >
                                            Send Email
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-12 border-t border-white/5 flex flex-wrap gap-4 ml-5">
                            <button
                                onClick={() => navigate(-1)}
                                className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white hover:border-white/20 transition-all font-display"
                            >
                                ← Go Back
                            </button>
                            <button
                                onClick={() => navigate('/faq')}
                                className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white hover:border-white/20 transition-all font-display"
                            >
                                View FAQ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
