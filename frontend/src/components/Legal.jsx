import React, { useEffect } from 'react';
import '../styles/componentsCSS/legal.css';

const Legal = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="legal-container centered-legal">
            <main className="legal-page">
                <h1>Legal Disclaimer</h1>
                <div className="legal-content">
                    <section>
                        <h2>General Information</h2>
                        <p>
                            Rifthub.lol is operated by <strong>Rifthub</strong>.
                        </p>
                        <p>
                            Rifthub.lol is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
                        </p>
                    </section>

                    <section id="trademarks">
                        <h2>Trademarks</h2>
                        <p>
                            League of Legends™ and Riot Games® are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc. All other trademarks are the property of their respective owners.
                        </p>
                    </section>

                    <section id="data-usage">
                        <h2>Data Usage</h2>
                        <p>
                            Rifthub.lol uses the Riot Games API. We comply with Riot's policies regarding data usage and intellectual property. The data provided on this site is for personal, non-commercial use by the players to track their progress and improve their skills.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Legal;
