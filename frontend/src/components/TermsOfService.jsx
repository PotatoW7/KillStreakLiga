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
        <div className="legal-page">
            <div className="legal-layout">

                <aside className="legal-sidebar">
                    <div className="legal-sidebar-inner glass-panel">
                        <div className="legal-sidebar-header">
                            <div className="legal-sidebar-bar" />
                            <h3 className="legal-sidebar-title">Contents</h3>
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
                    </div>
                </aside>

                <main className="legal-main">
                    <div className="legal-page-title">
                        <div className="legal-title-bar" />
                        <div>
                            <h1 className="legal-title">Terms of Service</h1>
                        </div>
                    </div>

                    <div className="legal-card glass-panel">
                        <div className="legal-card-glow" />

                        <section id="acceptance" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">1. Acceptance of Terms</h2>
                            </div>
                            <p className="legal-text">
                                By accessing or using <span className="highlight">RiftHub.lol</span> (the "Platform"), you formally agree to comply with and be bound by these Terms of Service. Access to the platform implies total acceptance of these terms.
                            </p>
                        </section>

                        <section id="description" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">2. Service Overview</h2>
                            </div>
                            <p className="legal-text">
                                RiftHub.lol provides League of Legends analytics, match history, and a peer-to-peer coaching marketplace. We provide in-depth data and community features to the user base.
                            </p>
                        </section>

                        <section id="riot-data" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">3. Riot Data Integration</h2>
                            </div>
                            <div className="legal-text">
                                <p>Data is retrieved via the Riot Games Global API. RiftHub maintains no official affiliation with Riot Games, Inc.</p>
                                <div className="legal-notice" style={{ marginTop: '1rem' }}>
                                    <p className="legal-notice-label">Data Access Policy:</p>
                                    <p>All data retrieved from the Riot Games API is distributed to the user base at no cost. RiftHub prohibits the sale of raw data or basic summoner statistics.</p>
                                </div>
                            </div>
                        </section>

                        <section id="user-accounts" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">4. User Account Registration</h2>
                            </div>
                            <p className="legal-text">
                                Advanced site features require account registration. Users maintain full responsibility for their account's security and all activity made under their account. We reserve the right to delete any account violating community guidelines.
                            </p>
                        </section>

                        <section id="prohibited" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">5. Prohibited conduct</h2>
                            </div>
                            <ul className="legal-grid-2">
                                {[
                                    "Impersonation"
                                ].map((item, i) => (
                                    <li key={i} className="legal-usage-item">
                                        <div className="legal-list-dot" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section id="boosting-warning" className="legal-section">
                            <div className="legal-warning-box">
                                <div className="legal-warning-glow" />
                                <div className="legal-section-header" style={{ marginBottom: '1rem' }}>
                                    <div className="legal-warning-bar" />
                                    <h2 className="legal-warning-title">6. Boosting Warning</h2>
                                </div>
                                <div className="legal-text">
                                    <p style={{ color: 'white', fontWeight: 700 }}>Boosting is strictly forbidden by Riot Games and will result in Account Suspension.</p>
                                    <p style={{ marginTop: '1rem' }}>RiftHub facilitates player development and learning only. Facilitating or requesting boosting services via this site will result in a <span style={{ color: '#ef4444', fontWeight: 900, fontStyle: 'italic' }}>Permanent Ban</span>. Engaging in unauthorized account activity is at your own risk.</p>
                                </div>
                            </div>
                        </section>

                        <section id="intellectual" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">7. Intellectual Property</h2>
                            </div>
                            <p className="legal-text">
                                All original content, site design, and architectural code on RiftHub.lol remain exclusive property of RiftHub. League of Legends items are subject to Riot Games, Inc. ownership.
                            </p>
                        </section>

                        <section id="disclaimer" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">8. Disclaimer of Warranties</h2>
                            </div>
                            <p className="legal-text" style={{ fontStyle: 'italic' }}>
                                This site is provided "AS IS". Rifthub disclaims all warranties, including implied merchantability or fitness for specific performance targets. No specific outcome is guaranteed.
                            </p>
                        </section>

                        <section id="limitation" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">9. Limitation of Liability</h2>
                            </div>
                            <p className="legal-text">
                                RiftHub systems shall not be liable for any data loss, profit degradation, or business interruption arising from site use or disconnection.
                            </p>
                        </section>

                        <section id="contact" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">10. Support</h2>
                            </div>
                            <div className="legal-contact-card">
                                <div>
                                    <p className="legal-contact-label">Support Email:</p>
                                    <p className="legal-contact-email">rifthubofficial@gmail.com</p>
                                </div>
                                <a href="mailto:rifthubofficial@gmail.com" className="legal-contact-btn">
                                    Contact Support
                                </a>
                            </div>
                        </section>
                    </div>

                    <div className="legal-end">
                        <p>End of Terms</p>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TermsOfService;
