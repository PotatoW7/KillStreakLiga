import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import '../styles/componentsCSS/cookieConsent.css';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const [preferences, setPreferences] = useState({
        essential: true
    });

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
        <div className="cookie-consent-overlay">
            <div className="cookie-consent-banner">
                <div className="cookie-consent-header">
                    <h2>We value your privacy</h2>
                </div>

                <div className="cookie-consent-body">
                    {!showSettings ? (
                        <>
                            <p>
                                Rifthub.lol uses cookies to enhance your experience.
                                By agreeing, you allow us to <strong>keep you logged in</strong> ("Remember Me").
                                If you disagree, you will have to login every time you visit the site.
                            </p>
                            <p>
                                We do not share your data with third-party partners for their own marketing purposes.
                            </p>
                        </>
                    ) : (
                        <div className="cookie-settings">
                            <div className="setting-item">
                                <div className="setting-info">
                                    <strong>Remember Me & Essential</strong>
                                    <span>Required for the site to function and to keep you logged in between sessions.</span>
                                </div>
                                <input type="checkbox" checked={preferences.essential} disabled />
                            </div>
                        </div>
                    )}
                </div>

                <div className="cookie-consent-actions">
                    {!showSettings ? (
                        <>
                            <button className="btn-secondary" onClick={() => setShowSettings(true)}>Details</button>
                            <button className="btn-secondary" onClick={handleDeclineAll}>Disagree</button>
                            <button className="btn-primary" onClick={handleAcceptAll}>Agree</button>
                        </>
                    ) : (
                        <>
                            <button className="btn-secondary" onClick={() => setShowSettings(false)}>Back</button>
                            <button className="btn-primary" onClick={handleAcceptAll}>Save & Agree</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
