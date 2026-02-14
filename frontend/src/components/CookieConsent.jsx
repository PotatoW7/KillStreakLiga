import React, { useState, useEffect } from 'react';
import '../styles/componentsCSS/cookieConsent.css';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [preferences, setPreferences] = useState({
        essential: true,
        analytics: true,
        marketing: false
    });

    useEffect(() => {
        const consent = localStorage.getItem('rifthub_cookie_consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAcceptAll = () => {
        localStorage.setItem('rifthub_cookie_consent', JSON.stringify({
            essential: true,
            analytics: true,
            marketing: true
        }));
        setIsVisible(false);
    };

    const handleSavePreferences = () => {
        localStorage.setItem('rifthub_cookie_consent', JSON.stringify(preferences));
        setIsVisible(false);
    };

    const handleDeclineAll = () => {
        localStorage.setItem('rifthub_cookie_consent', JSON.stringify({
            essential: true,
            analytics: false,
            marketing: false
        }));
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="cookie-consent-overlay">
            <div className="cookie-consent-banner">
                <div className="cookie-consent-header">
                    <h2>We value your privacy</h2>
                </div>

                <div className="cookie-consent-body">
                    {!showSettings ? (
                        <>
                            <p>
                                Rifthub.lol uses cookies to enhance your experience, analyze site usage, and assist in our efforts to provide a better service. We do not share your data with third-party partners for their own marketing purposes.
                            </p>
                            <p>
                                By clicking "Agree", you consent to our use of cookies as described in our <a href="/privacy">Privacy Policy</a>. This website is operated by <strong>Rifthub</strong>.
                            </p>
                        </>
                    ) : (
                        <div className="cookie-settings">
                            <div className="setting-item">
                                <div className="setting-info">
                                    <strong>Essential Cookies</strong>
                                    <span>Required for the site to function properly (e.g., login, security).</span>
                                </div>
                                <input type="checkbox" checked={preferences.essential} disabled />
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <strong>Analytics Cookies</strong>
                                    <span>Help us understand how visitors interact with the site.</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences.analytics}
                                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                                />
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <strong>Personalization</strong>
                                    <span>Allow us to remember your preferences and settings.</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences.marketing}
                                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="cookie-consent-actions">
                    {!showSettings ? (
                        <>
                            <button className="btn-secondary" onClick={() => setShowSettings(true)}>Settings</button>
                            <button className="btn-secondary" onClick={handleDeclineAll}>Disagree</button>
                            <button className="btn-primary" onClick={handleAcceptAll}>Agree</button>
                        </>
                    ) : (
                        <>
                            <button className="btn-secondary" onClick={() => setShowSettings(false)}>Back</button>
                            <button className="btn-primary" onClick={handleSavePreferences}>Save & Close</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
