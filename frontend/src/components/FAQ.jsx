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
        <div className="legal-page" style={{ paddingTop: '8rem', paddingBottom: '6rem' }}>
            <div className="legal-layout" style={{ maxWidth: '80rem', gap: '3rem' }}>
                <aside className="legal-sidebar">
                    <div className="legal-sidebar-inner glass-panel" style={{ top: '8rem' }}>
                        <div className="legal-sidebar-header">
                            <div className="legal-sidebar-bar" />
                            <h3 className="legal-sidebar-title">Logic Base Map</h3>
                        </div>
                        <nav>
                            <ul className="legal-nav-list">
                                {sections.map(section => (
                                    <li key={section.id}>
                                        <a href={`#${section.id}`} className="legal-nav-link">
                                            {section.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <button
                                onClick={() => navigate('/contact')}
                                className="cookie-btn-accept"
                                style={{ width: '100%', fontSize: '0.5625rem' }}
                            >
                                Send Signal
                            </button>
                        </div>
                    </div>
                </aside>

                <main className="legal-main" style={{ maxWidth: '56rem', gap: '4rem', animation: 'slideInFromRight 1s ease-out forwards' }}>
                    <div>
                        <div className="legal-page-title">
                            <div className="legal-title-bar" style={{ width: '0.5rem' }} />
                            <h1 className="legal-title" style={{ fontSize: '2.25rem' }}>Logic Base</h1>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginLeft: '1.25rem' }}>
                        <section id="what-is-rifthub" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">01.</span> What is Rifthub?
                            </h2>
                            <p className="faq-answer">
                                Rifthub is an advanced neural analytics and social synchronization platform for League of Legends aspirants.
                                We provide high-fidelity telemetry for your summoner nodes, comprehensive match histories,
                                and a secure marketplace to connect with elite tactical coaches.
                            </p>
                        </section>

                        <section id="is-it-free" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">02.</span> Is it free?
                            </h2>
                            <p className="faq-answer">
                                Affirmative. Accessing neural telemetry, viewing historical combat records, and utilizing our analytical tools
                                requires no resource credits. We do not charge for access to data retrieved via the Riot Games interface.
                            </p>
                        </section>

                        <section id="riot-games" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">03.</span> Is it official?
                            </h2>
                            <p className="faq-answer">
                                Negative. Rifthub.lol is an independent entity. We are not endorsed by Riot Games
                                and do not reflect the views or directives of Riot Games or its authorized operators.
                            </p>
                        </section>

                        <section id="coaching" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">04.</span> How does training work?
                            </h2>
                            <p className="faq-answer">
                                Tactical instructors list their services on the marketplace. Aspirants can analyze and book
                                training protocols to enhance their combat efficiency. Rifthub facilitates the synchronization;
                                specific training parameters are handled between instructor and student.
                            </p>
                        </section>

                        <section id="data-accuracy" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">05.</span> Signal accuracy?
                            </h2>
                            <p className="faq-answer">
                                We intercept telemetry directly from official Riot Games endpoints. While we strive for absolute
                                synchronization, minor signal delays may occur during interface maintenance or system updates.
                            </p>
                        </section>

                        <section id="account" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">06.</span> Authentication?
                            </h2>
                            <p className="faq-answer">
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
