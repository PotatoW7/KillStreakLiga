import React, { useEffect } from 'react';

const Legal = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="legal-page">
            <div className="legal-layout" style={{ maxWidth: '56rem' }}>
                <div className="legal-page-title">
                    <div className="legal-title-bar" />
                    <div>
                        <h1 className="legal-title">Legal Information</h1>
                    </div>
                </div>
                <div className="legal-card glass-panel">
                    <div className="legal-card-glow" style={{ width: '16rem', height: '16rem' }} />
                    <section className="legal-section" style={{ position: 'relative' }}>
                        <div className="legal-section-header">
                            <div className="legal-section-bar" />
                            <h2 className="legal-section-title">General Information</h2>
                        </div>
                        <div className="legal-text">
                            <p></p>
                            <p className="legal-info-card" style={{ fontStyle: 'italic' }}>
                                Rifthub.lol is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
                            </p>
                        </div>
                    </section>

                    <section id="trademarks" className="legal-section" style={{ position: 'relative' }}>
                        <div className="legal-section-header">
                            <div className="legal-section-bar" />
                            <h2 className="legal-section-title">Trademarks</h2>
                        </div>
                        <p className="legal-text">
                            League of Legends™ and Riot Games® are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc. All other trademarks are the property of their respective owners.
                        </p>
                    </section>

                    <section id="data-usage" className="legal-section" style={{ position: 'relative' }}>
                        <div className="legal-section-header">
                            <div className="legal-section-bar" />
                            <h2 className="legal-section-title">Data Transmission</h2>
                        </div>
                        <p className="legal-text">
                            Rifthub.lol utilizes the Riot Games Global API. We maintain strict compliance with Riot's policies regarding data usage and intellectual property rights. Information retrieved through this interface is intended for personal, non-commercial use to optimize user knowledge and skill development.
                        </p>
                    </section>
                </div>

                <div className="legal-end" style={{ visibility: 'hidden' }}>
                    <p>End of Page</p>
                </div>
            </div>
        </div>
    );
};

export default Legal;
