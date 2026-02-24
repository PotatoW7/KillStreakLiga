import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="site-footer">
            <div className="footer-top-line" />

            <div className="footer-inner">
                <div className="footer-content">
                    <div className="footer-brand">
                        <div className="footer-brand-inner">
                            <div className="footer-logo">
                                RIFTHUB<span className="accent">.LOL</span>
                            </div>
                        </div>
                        <p className="footer-disclaimer">
                            Rifthub.lol is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.
                        </p>
                    </div>

                    <div className="footer-nav">
                        <div className="footer-nav-group">
                            <h4 className="footer-nav-title">Resources</h4>
                            <div className="footer-nav-links">
                                <FooterLink to="/legal">Legal Information</FooterLink>
                                <FooterLink to="/tos">Terms of Service</FooterLink>
                                <FooterLink to="/privacy">Privacy Policy</FooterLink>
                            </div>
                        </div>
                        <div className="footer-nav-group">
                            <h4 className="footer-nav-title">Support and Contact</h4>
                            <div className="footer-nav-links">
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
        <Link to={to} className="footer-link">
            <div className="footer-link-dot" />
            {children}
        </Link>
    );
}

export default Footer;
