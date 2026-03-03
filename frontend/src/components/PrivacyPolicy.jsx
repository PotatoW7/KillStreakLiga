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
                            <h1 className="legal-title">Privacy Policy</h1>
                        </div>
                    </div>

                    <div className="legal-card glass-panel">
                        <div className="legal-card-glow" />

                        <section id="introduction" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">1. Introduction</h2>
                            </div>
                            <div className="legal-text">
                                <p>Welcome to <span className="highlight">RiftHub.lol</span>. Your privacy is of paramount importance to us. This Privacy Policy outlines the types of information we collect, how we use it, and the security measures to ensure your personal data remains protected and compliant with industry standards.</p>
                                <p style={{ marginTop: '1rem' }}>Use of RiftHub.lol acknowledges consent to the data practices described in this policy.</p>
                            </div>
                        </section>

                        <section id="data-collection" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">2. Data Collection</h2>
                            </div>

                            <div className="legal-subsections">
                                <div className="legal-info-card">
                                    <h3>A. Personal Information</h3>
                                    <p style={{ marginBottom: '1rem' }}>During account registration, we collect:</p>
                                    <ul className="legal-grid-2">
                                        {["Email address", "Profile preferences", "Profile biography", "Uploaded profile images"].map((item, i) => (
                                            <li key={i} className="legal-list-item">
                                                <div className="legal-list-dot" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="legal-info-card">
                                    <h3>B. Automated Data Collection</h3>
                                    <p>
                                        We automatically collect log information during site access, including IP address, browser type, and operating system, to optimize user experience and maintain system security.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section id="riot-api" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">3. Riot API Integration</h2>
                            </div>
                            <div className="legal-text">
                                <p>RiftHub.lol utilizes the official Riot Games API to retrieve and display League of Legends player data, match history, and game information.</p>
                                <div className="legal-notice" style={{ marginTop: '1rem' }}>
                                    <p className="legal-notice-label">Service Notice:</p>
                                    <p>All data retrieved via this integration is accessed through official Riot Games channels. We do not charge for access. Use of this data is strictly informational, intended for performance analysis and community interaction.</p>
                                </div>
                            </div>
                        </section>

                        <section id="cookies" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">4. Cookies & Tracking</h2>
                            </div>
                            <div className="legal-text">
                                <p>We use cookies to personalize your experience. These are small data files stored on your device to facilitate site functionality.</p>
                                <div className="legal-grid-3" style={{ marginTop: '1rem' }}>
                                    {[
                                        { title: "Authentication", desc: "Maintains your session connection." },
                                        { title: "Preferences", desc: "Remembers your settings." },
                                        { title: "Analytics", desc: "Optimizes site performance." }
                                    ].map((chip, i) => (
                                        <div key={i} className="legal-chip">
                                            <p className="legal-chip-title">{chip.title}</p>
                                            <p className="legal-chip-desc">{chip.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="legal-note" style={{ marginTop: '1rem' }}>Disabling cookies may affect certain features of the site.</p>
                            </div>
                        </section>

                        <section id="data-usage" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">5. Data Usage</h2>
                            </div>
                            <ul className="legal-usage-list">
                                {[
                                    "Maintain and improve service quality",
                                    "Facilitate the coaching marketplace",
                                    "Keep you signed in your account"
                                ].map((item, i) => (
                                    <li key={i} className="legal-usage-item">
                                        <div className="legal-usage-dot" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section id="data-protection" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">6. Security & Data Protection</h2>
                            </div>
                            <p className="legal-text">
                                We implement rigorous security measures to maintain the safety of your information. Your data is stored behind secured networks and is only accessible by a limited number of administrators with special access rights.
                            </p>
                        </section>

                        <section id="third-parties" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">7. Third-Party Services</h2>
                            </div>
                            <p className="legal-text">
                                We do not sell or trade your personally identifiable information. Rifthub.lol utilizes <span className="highlight">Google Firebase</span> for authentication and database services. Refer to their Privacy Policy for further details.
                            </p>
                        </section>

                        <section id="contact" className="legal-section">
                            <div className="legal-section-header">
                                <div className="legal-section-bar" />
                                <h2 className="legal-section-title">8. Support</h2>
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

                </main>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
