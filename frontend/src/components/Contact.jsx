import React from 'react';
import '../styles/componentsCSS/legal.css';

const Contact = () => {
    return (
        <div className="legal-page">
            <h1>Contact Us</h1>
            <div className="legal-content">
                <p>If you have any questions, feedback, or need support, please feel free to reach out to us via email.</p>
                <div className="contact-card">
                    <h3>Email Support</h3>
                    <p>
                        <a href="mailto:rifthubofficial@gmail.com" className="contact-email">
                            rifthubofficial@gmail.com
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Contact;
