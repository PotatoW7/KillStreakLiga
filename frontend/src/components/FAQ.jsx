import React, { useEffect } from 'react';
import '../styles/componentsCSS/legal.css';

const FAQ = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="legal-container">
            <aside className="legal-sidebar">
                <h3>Quick Links</h3>
                <ul>
                    <li><a href="#what-is-rifthub">What is Rifthub?</a></li>
                    <li><a href="#is-it-free">Is it free?</a></li>
                    <li><a href="#riot-games">Is it official?</a></li>
                    <li><a href="#coaching">How does coaching work?</a></li>
                    <li><a href="#data-accuracy">Is the data accurate?</a></li>
                    <li><a href="#account">Do I need an account?</a></li>
                </ul>
            </aside>

            <main className="legal-page">
                <h1>Frequently Asked Questions</h1>
                <div className="legal-content">
                    <section id="what-is-rifthub">
                        <h2>What is Rifthub?</h2>
                        <p>Rifthub is an advanced analytics and social platform for League of Legends players. We provide data for your summoner account, match history and a marketplace to connect with professional coaches.</p>
                    </section>

                    <section id="is-it-free">
                        <h2>Is Rifthub free to use?</h2>
                        <p>Yes! Searching for summoners, viewing match history, and using our analytical tools is completely free. We do not charge for access to data retrieved from the Riot Games API.</p>
                    </section>

                    <section id="riot-games">
                        <h2>Is Rifthub endorsed by Riot Games?</h2>
                        <p>No. Rifthub.lol is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties.</p>
                    </section>

                    <section id="coaching">
                        <h2>How does the coaching marketplace work?</h2>
                        <p>Coaches can list their services on Rifthub, and players can browse and book sessions to improve their gameplay. While Rifthub facilitates the connection, the specific terms of coaching are handled between the coach and the student.</p>
                    </section>

                    <section id="data-accuracy">
                        <h2>How accurate is the data?</h2>
                        <p>We retrieve data directly from the official Riot Games API. While we strive for 100% accuracy, there may be slight delays or discrepancies due to Riot's server updates or API maintenance.</p>
                    </section>

                    <section id="account">
                        <h2>Do I need an account to use Rifthub?</h2>
                        <p>Basic features like summoner lookup and match history do not require an account. However, creating an account allows you to save your profile, participate in community feeds, and book coaching sessions.</p>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default FAQ;
