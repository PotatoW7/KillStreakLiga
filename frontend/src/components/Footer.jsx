import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/layout/footer.css';

const Footer = () => {
    return (
        <footer className="rifthub-footer">
            <div className="footer-content">
                <div className="footer-copyright">
                    © {new Date().getFullYear()} Rifthub
                </div>
                <div className="footer-riot-disclaimer">
                    Rifthub.lol is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
                </div>
                <div className="footer-links">
                    <Link to="/contact">Contact</Link>
                    <Link to="/faq">FAQ</Link>
                    <Link to="/privacy">Privacy</Link>
                    <Link to="/tos">Terms</Link>
                    <Link to="/legal">Legal</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
