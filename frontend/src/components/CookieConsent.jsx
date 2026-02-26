import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

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
        <div className="cookie-consent-wrapper">
            <div className="cookie-consent-card glass-panel">
                <div className="cookie-bg-glow-1" />
                <div className="cookie-bg-glow-2" />

                <div className="cookie-consent-inner">
                    <div className="cookie-header">
                        <div className="cookie-header-inner">
                            <div className="cookie-title-row">
                                <div className="cookie-title-bar" />
                                <h2 className="cookie-title">Privacy Protocol</h2>
                            </div>
                            <p className="cookie-subtitle">System Identifier: [RHS-PRIV-01]</p>
                        </div>
                    </div>

                    <div>
                        <p className="cookie-desc">
                            If you <span className="highlight">accept</span>, you will stay logged in.
                            <br />If you <strong style={{ color: 'rgba(255,255,255,0.7)' }}>decline</strong>, you will not be logged in the next time you open the page.
                        </p>
                    </div>

                    <div className="cookie-actions">
                        <button className="cookie-btn-accept" onClick={handleAcceptAll}>
                            Accept
                        </button>
                        <button className="cookie-btn-decline" onClick={handleDeclineAll}>
                            Decline
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
