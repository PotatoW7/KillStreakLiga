import React, { useState, useEffect } from 'react';
import { fetchDDragon } from '../utils/fetchDDragon';

const IconRenderer = ({ text, className = "" }) => {
    const [iconMap, setIconMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadIcons = async () => {
            try {
                const { iconMap: map } = await fetchDDragon();
                setIconMap(map);
            } catch (error) {
                console.error("Error loading icons for IconRenderer:", error);
            } finally {
                setLoading(false);
            }
        };
        loadIcons();
    }, []);

    if (!text) return null;
    if (loading) return <span className={className}>{text}</span>;

    const normalize = (name) => name.toLowerCase().replace(/\s+/g, '_').replace(/['.]/g, '');

    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    const parts = text.split(/(:[a-z0-9_']+:)|(https?:\/\/[^\s]+)/gi);

    return (
        <span className={`icon-rendered-text ${className}`}>
            {parts.map((part, index) => {
                if (!part) return null;

                if (part.startsWith(':') && part.endsWith(':')) {
                    const iconName = normalize(part.slice(1, -1));
                    const iconData = iconMap[iconName];

                    if (iconData) {
                        return (
                            <img
                                key={index}
                                src={iconData.url}
                                alt={iconData.name}
                                title={iconData.name}
                                className="inline-lol-icon"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'inline';
                                }}
                            />
                        );
                    }
                }

                if (part.match(urlRegex)) {
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="post-link"
                        >
                            {part}
                        </a>
                    );
                }

                return <span key={index}>{part}</span>;
            })}
        </span>
    );

};

export const LoLSuggestions = ({ query, onSelect, activeIndex }) => {
    const [iconMap, setIconMap] = useState({});

    useEffect(() => {
        const loadIcons = async () => {
            try {
                const { iconMap: map } = await fetchDDragon();
                setIconMap(map || {});
            } catch (error) {
                console.error("Error loading icons for LoLSuggestions:", error);
            }
        };
        loadIcons();
    }, []);

    const normalize = (name) => name.toLowerCase().replace(/\s+/g, '_').replace(/['.]/g, '');

    const filtered = Object.values(iconMap)
        .filter(icon => normalize(icon.name).startsWith(query.toLowerCase()))
        .slice(0, 5);

    if (filtered.length === 0) return null;

    return (
        <div className="suggestion-dropdown">
            {filtered.map((icon, idx) => (
                <div
                    key={idx}
                    className={`suggestion-item ${idx === activeIndex ? 'active' : ''}`}
                    onClick={() => onSelect(icon)}
                >
                    <img src={icon.url} alt={icon.name} className="suggestion-icon" />
                    <span>{icon.name}</span>
                </div>
            ))}
        </div>
    );
};

export default IconRenderer;
