import React from 'react';
import { useNavigate } from "react-router-dom";

const Contact = () => {
    const navigate = useNavigate();

    return (
        <div className="legal-page" style={{ paddingTop: '8rem' }}>
            <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
                <div className="legal-card glass-panel" style={{ borderRadius: '2.5rem', padding: '3rem', borderColor: 'hsl(var(--primary) / 0.2)', animation: 'slideInFromBottom8 1s ease-out forwards' }}>
                    <div className="legal-card-glow" style={{ opacity: 0.2 }} />
                    <div className="auth-bg-blob-2" style={{ position: 'absolute' }} />

                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="legal-page-title">
                                <div className="legal-title-bar" style={{ height: '2.5rem' }} />
                                <h1 className="legal-title" style={{ fontSize: '2.25rem' }}>Contact Us</h1>
                            </div>
                            <p className="cookie-subtitle" style={{ marginLeft: '1.25rem' }}>Get in touch with the Rifthub support team.</p>
                        </div>

                        <div style={{ marginLeft: '1.25rem', maxWidth: '42rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <p className="legal-text" style={{ textTransform: 'none', letterSpacing: '0.05em' }}>
                                Having issues or need help? Send us an email and our team will get back to you as soon as possible.
                            </p>

                            <div className="legal-contact-card" style={{ background: 'rgba(0,0,0,0.4)' }}>
                                <div>
                                    <h3 className="legal-contact-label" style={{ letterSpacing: '0.3em', color: 'hsl(var(--primary) / 0.7)' }}>Email Address</h3>
                                    <a
                                        href="mailto:rifthubofficial@gmail.com"
                                        style={{ fontSize: '1.25rem', fontWeight: 900, color: 'white', transition: 'color 0.3s', letterSpacing: '-0.025em' }}
                                    >
                                        rifthubofficial@gmail.com
                                    </a>
                                </div>
                                <button
                                    onClick={() => window.location.href = "mailto:rifthubofficial@gmail.com"}
                                    className="legal-contact-btn"
                                    style={{ flexShrink: 0 }}
                                >
                                    Send Email
                                </button>
                            </div>
                        </div>

                        <div style={{ paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginLeft: '1.25rem' }}>
                            <button
                                onClick={() => navigate(-1)}
                                className="cookie-btn-settings"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                ← Go Back
                            </button>
                            <button
                                onClick={() => navigate('/faq')}
                                className="cookie-btn-settings"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                View FAQ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Contact;
