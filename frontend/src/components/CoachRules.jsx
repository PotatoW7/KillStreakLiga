import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/componentsCSS/coaching.css';

function CoachRules() {
    return (
        <div className="coach-rules-page">
            <div className="coach-rules-container">
                <div className="rules-header">
                    <h1>Coaching Guidelines & Requirements</h1>
                    <p>Everything you need to know about becoming a Killstreak coach</p>
                </div>

                <section className="rules-section">
                    <h2>Eligibility Requirements</h2>
                    <div className="rules-card">
                        <ul>
                            <li>
                                <strong>Rank Requirement:</strong> You must be Platinum rank or higher in Solo/Duo or Flex queue.
                            </li>
                            <li>
                                <strong>Verified Account:</strong> Your Riot Games account must be linked and verified on Killstreak.
                            </li>
                            <li>
                                <strong>Good Standing:</strong> Your account must be in good standing with no recent bans or restrictions.
                            </li>
                            <li>
                                <strong>Experience:</strong> Demonstrate knowledge in at least one specialty area (lane, macro, etc.).
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="rules-section">
                    <h2>Code of Conduct</h2>
                    <div className="rules-card">
                        <ul>
                            <li>
                                <strong>Professionalism:</strong> Treat all students with respect and patience, regardless of their skill level.
                            </li>
                            <li>
                                <strong>Honesty:</strong> Be truthful about your expertise and don't promise unrealistic results.
                            </li>
                            <li>
                                <strong>Punctuality:</strong> Honor your scheduled sessions and notify students of any changes in advance.
                            </li>
                            <li>
                                <strong>Constructive Feedback:</strong> Focus on improvement, not criticism. Help students grow.
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="rules-section">
                    <h2>Pricing Guidelines</h2>
                    <div className="rules-card">
                        <ul>
                            <li>
                                <strong>Set Fair Prices:</strong> Consider your rank, experience, and market rates when pricing sessions.
                            </li>
                            <li>
                                <strong>Be Transparent:</strong> Clearly state what's included in each coaching session.
                            </li>
                            <li>
                                <strong>Suggested Rates:</strong>
                                <ul className="sub-list">
                                    <li>Platinum Coaches: $10-20/hour</li>
                                    <li>Diamond Coaches: $20-35/hour</li>
                                    <li>Master+ Coaches: $35-75/hour</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Refund Policy:</strong> Have a clear policy for cancellations and refunds.
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="rules-section">
                    <h2>Application Process</h2>
                    <div className="rules-card steps">
                        <div className="step">
                            <span className="step-number">1</span>
                            <div>
                                <strong>Link Your Account</strong>
                                <p>Verify your Riot Games account on your Killstreak profile.</p>
                            </div>
                        </div>
                        <div className="step">
                            <span className="step-number">2</span>
                            <div>
                                <strong>Submit Application</strong>
                                <p>Fill out the coach application form with your experience and specialties.</p>
                            </div>
                        </div>
                        <div className="step">
                            <span className="step-number">3</span>
                            <div>
                                <strong>Admin Review</strong>
                                <p>Our team will review your application (usually within 48 hours).</p>
                            </div>
                        </div>
                        <div className="step">
                            <span className="step-number">4</span>
                            <div>
                                <strong>Start Coaching!</strong>
                                <p>Once approved, you can create coaching offerings and start helping players.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rules-section">
                    <h2>Violations & Consequences</h2>
                    <div className="rules-card warning">
                        <p>Violating these guidelines may result in:</p>
                        <ul>
                            <li>Warning and temporary suspension of coaching privileges</li>
                            <li>Permanent removal from the coaching program</li>
                            <li>Account ban for severe violations</li>
                        </ul>
                        <p className="report-note">
                            Students can report coaches for guideline violations. All reports are reviewed by our admin team.
                        </p>
                    </div>
                </section>

                <div className="rules-cta">
                    <p>Ready to share your knowledge and help others climb?</p>
                    <Link to="/become-coach" className="apply-now-btn">
                        Apply to Become a Coach
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default CoachRules;
