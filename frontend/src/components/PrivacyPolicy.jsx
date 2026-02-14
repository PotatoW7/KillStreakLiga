import React, { useEffect } from 'react';
import '../styles/componentsCSS/legal.css';

const PrivacyPolicy = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="legal-container">
            <aside className="legal-sidebar">
                <h3>Contents</h3>
                <ul>
                    <li><a href="#introduction">1. Introduction</a></li>
                    <li><a href="#data-collection">2. Data We Collect</a></li>
                    <li><a href="#riot-api">3. Riot Games API Data</a></li>
                    <li><a href="#cookies">4. Cookies & Tracking</a></li>
                    <li><a href="#data-usage">5. How We Use Data</a></li>
                    <li><a href="#data-protection">6. Data Protection</a></li>
                    <li><a href="#third-parties">7. Third-Party Services</a></li>
                    <li><a href="#contact">8. Contact Information</a></li>
                </ul>
            </aside>

            <main className="legal-page">
                <h1>Privacy Policy</h1>
                <p className="last-updated">Last Updated: February 14, 2026</p>

                <div className="legal-content">
                    <section id="introduction">
                        <h2>1. Introduction</h2>
                        <p>Welcome to Rifthub.lol. Your privacy is of paramount importance to us. This Privacy Policy outlines the types of information we collect, how we use it, and the steps we take to ensure your personal data is handled securely and in compliance with global data protection standards.</p>
                        <p>By using Rifthub.lol, you consent to the data practices described in this policy.</p>
                    </section>

                    <section id="data-collection">
                        <h2>2. Data We Collect</h2>
                        <h3>A. Information You Provide</h3>
                        <p>When you register an account on Rifthub, we may collect information such as:</p>
                        <ul>
                            <li>Email address</li>
                            <li>Username and display preferences</li>
                            <li>Profile biography and social links</li>
                            <li>Uploaded profile images</li>
                        </ul>
                        <h3>B. Automated Collection</h3>
                        <p>We automatically collect certain information when you visit our site, including your IP address, browser type, and operating system, to improve user experience and maintain site security.</p>
                    </section>

                    <section id="riot-api">
                        <h2>3. Riot Games API Data</h2>
                        <p>Rifthub.lol utilizes the official Riot Games API to retrieve and display League of Legends player statistics, match history, and champion data.</p>
                        <p><strong>Important Notice:</strong> All Riot Games API data displayed on Rifthub.lol is accessed through Riot's official infrastructure. We do not charge users for access to this data. Our use of this data is strictly for informational and analytical purposes, aimed at helping players track their performance and find teammates.</p>
                        <p>This data is subject to the Riot Games Terms of Service and Privacy Policy.</p>
                    </section>

                    <section id="cookies">
                        <h2>4. Cookies & Tracking</h2>
                        <p>Rifthub.lol uses "cookies" to help personalize your online experience. A cookie is a small text file that is placed on your hard disk by a web page server. Cookies cannot be used to run programs or deliver viruses to your computer.</p>
                        <p>We use cookies for the following purposes:</p>
                        <ul>
                            <li><strong>Authentication:</strong> To keep you logged in as you navigate through Rifthub.</li>
                            <li><strong>Preferences:</strong> To remember your settings, such as your preferred region or theme.</li>
                            <li><strong>Analytics:</strong> To understand how users interact with our site, allowing us to optimize performance and content.</li>
                        </ul>
                        <p>You have the ability to accept or decline cookies. Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. If you choose to decline cookies, you may not be able to fully experience the interactive features of Rifthub.lol.</p>
                    </section>

                    <section id="data-usage">
                        <h2>5. How We Use Data</h2>
                        <p>We use the information we collect to:</p>
                        <ul>
                            <li>Provide, maintain, and improve our services.</li>
                            <li>Facilitate the Rifthub coaching marketplace.</li>
                            <li>Display accurate match history and player statistics.</li>
                            <li>Process and display community feeds and social interactions.</li>
                            <li>Communicate with you regarding updates or support requests.</li>
                        </ul>
                    </section>

                    <section id="data-protection">
                        <h2>6. Data Protection</h2>
                        <p>We implement a variety of security measures to maintain the safety of your personal information. Your personal data is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems and are required to keep the information confidential.</p>
                    </section>

                    <section id="third-parties">
                        <h2>7. Third-Party Services</h2>
                        <p>We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our website, conducting our business, or servicing you, so long as those parties agree to keep this information confidential.</p>
                        <p>Rifthub.lol uses Firebase for authentication and database services. Please refer to Google's Privacy Policy for more information on how they handle data.</p>
                    </section>

                    <section id="contact">
                        <h2>8. Contact Information</h2>
                        <p>If you have any questions or concerns regarding this Privacy Policy, please contact us at:</p>
                        <p><strong>Email:</strong> <a href="mailto:rifthubofficial@gmail.com" className="contact-email">rifthubofficial@gmail.com</a></p>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
