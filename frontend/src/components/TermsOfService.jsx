import React, { useEffect } from 'react';
import '../styles/componentsCSS/legal.css';

const TermsOfService = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="legal-container">
            <aside className="legal-sidebar">
                <h3>Contents</h3>
                <ul>
                    <li><a href="#acceptance">1. Acceptance of Terms</a></li>
                    <li><a href="#description">2. Description of Service</a></li>
                    <li><a href="#riot-data">3. Riot Games Data</a></li>
                    <li><a href="#user-accounts">4. User Accounts</a></li>
                    <li><a href="#prohibited">5. Prohibited Conduct</a></li>
                    <li><a href="#intellectual">6. Intellectual Property</a></li>
                    <li><a href="#disclaimer">7. Disclaimer of Warranties</a></li>
                    <li><a href="#limitation">8. Limitation of Liability</a></li>
                    <li><a href="#contact">9. Contact Information</a></li>
                </ul>
            </aside>

            <main className="legal-page">
                <h1>Terms of Service</h1>
                <p className="last-updated">Last Updated: February 14, 2026</p>

                <div className="legal-content">
                    <section id="acceptance">
                        <h2>1. Acceptance of Terms</h2>
                        <p>By accessing or using Rifthub.lol (the "Site"), you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use the Site.</p>
                    </section>

                    <section id="description">
                        <h2>2. Description of Service</h2>
                        <p>Rifthub.lol provides League of Legends player statistics, match history, and a community marketplace for coaching services. We aim to enhance the gaming experience by providing deep analytical insights and social features.</p>
                    </section>

                    <section id="riot-data">
                        <h2>3. Riot Games Data</h2>
                        <p>Rifthub.lol utilizes data from the Riot Games API. We are not endorsed by Riot Games and do not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties.</p>
                        <p><strong>Free Data Policy:</strong> Rifthub.lol provides all data retrieved from the Riot Games API to our users free of charge. We do not sell this data nor do we charge for the display of basic summoner statistics or match history.</p>
                    </section>

                    <section id="user-accounts">
                        <h2>4. User Accounts</h2>
                        <p>To access certain features of the Site, you may be required to register an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>
                        <p>We reserve the right to terminate accounts that violate our community standards or these Terms of Service.</p>
                    </section>

                    <section id="prohibited">
                        <h2>5. Prohibited Conduct</h2>
                        <p>Users are prohibited from:</p>
                        <ul>
                            <li>Using the Site for any illegal purpose.</li>
                            <li>Attempting to gain unauthorized access to our systems.</li>
                            <li>Harassing or abusing other users.</li>
                            <li>Scraping data from the Site for commercial use without permission.</li>
                            <li>Impersonating Riot Games officials or Rifthub staff.</li>
                        </ul>
                    </section>

                    <section id="boosting-warning" className="legal-warning-box">
                        <h2>6. IMPORTANT: Boosting Warning</h2>
                        <p><strong>Boosting is strictly forbidden by Riot Games and is a bannable offense.</strong></p>
                        <p>Rifthub does not offer, support, or facilitate boosting services. Any attempt to use our coaching marketplace for boosting purposes will result in an immediate and permanent ban from Rifthub. Players and coaches who engage in boosting do so at their own risk; Rifthub is not responsible for any actions taken by Riot Games against your account.</p>
                    </section>

                    <section id="intellectual">
                        <h2>7. Intellectual Property</h2>
                        <p>All original content, features, and functionality on Rifthub.lol are and will remain the exclusive property of Rifthub and its licensors. League of Legends and all associated assets are the property of Riot Games, Inc.</p>
                    </section>

                    <section id="disclaimer">
                        <h2>7. Disclaimer of Warranties</h2>
                        <p>The Site is provided on an "AS IS" and "AS AVAILABLE" basis. Rifthub makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability or fitness for a particular purpose.</p>
                    </section>

                    <section id="limitation">
                        <h2>8. Limitation of Liability</h2>
                        <p>In no event shall Rifthub or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the Site.</p>
                    </section>

                    <section id="contact">
                        <h2>9. Contact Information</h2>
                        <p>Questions about the Terms of Service should be sent to us at:</p>
                        <p><strong>Email:</strong> <a href="mailto:rifthubofficial@gmail.com" className="contact-email">rifthubofficial@gmail.com</a></p>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default TermsOfService;
