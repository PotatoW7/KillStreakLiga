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
                            <h1 className="legal-title" style={{ fontSize: '2.25rem' }}>FAQ</h1>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginLeft: '1.25rem' }}>
                        <section id="what-is-rifthub" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">01.</span> What is Rifthub?
                            </h2>
                            <p className="faq-answer">
                                RiftHub is an advanced analytics and social synchronization platform for the League of Legends community.
                                We provide detailed information on your summoner account and others, comprehensive match histories, a secure marketplace to connect with elite tactical coaches, and social features such as chat and activity feeds to engage with the community.
                            </p>
                        </section>

                        <section id="is-it-free" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">02.</span> Is it free?
                            </h2>
                            <p className="faq-answer">
                                RiftHub is free to use. You can view match histories, analyze gameplay, and use all our tools at no cost. The only paid features are available on our coaching page.
                            </p>
                        </section>

                        <section id="riot-games" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">03.</span> Is it official?
                            </h2>
                            <p className="faq-answer">
                                RiftHub.lol is entirely independent. We are not endorsed by Riot Games and do not reflect their views or policies
                            </p>
                        </section>

                        <section id="coaching" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">04.</span> How does training work?
                            </h2>
                            <p className="faq-answer">
                                Tactical instructors offer their services on our marketplace. Players can browse, analyze, and book training sessions to improve their gameplay. RiftHub handles scheduling and coordination, while the specific training plan is managed directly between the instructor and the student.
                            </p>
                        </section>

                        <section id="data-accuracy" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">05.</span> Signal accuracy?
                            </h2>
                            <p className="faq-answer">
                                We retrieve data directly from Riot Games’ official endpoints. While we aim for real-time updates, minor delays may occur during system maintenance or updates.
                            </p>
                        </section>

                        <section id="account" className="legal-section" style={{ scrollMarginTop: '8rem' }}>
                            <h2 className="faq-question">
                                <span className="faq-number">06.</span> Authentication?
                            </h2>
                            <p className="faq-answer">
                                Accessing match data and basic combat records doesn’t require authentication. Registering an account lets you save your profile, sync with the community feed, and book training sessions.
                            </p>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default FAQ;
