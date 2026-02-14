import React from 'react';
import '../styles/componentsCSS/itemTooltip.css';

const ItemTooltip = ({ item, position }) => {
    if (!item) return null;

    // Function to sanitize and format the description
    // Data Dragon descriptions contain HTML tags like <stats>, <passive>, <br>, etc.
    const formatDescription = (description) => {
        if (!description) return '';
        return description
            .replace(/<stats>/g, '<div class="item-stats">')
            .replace(/<\/stats>/g, '</div>')
            .replace(/<passive>/g, '<div class="item-passive">')
            .replace(/<\/passive>/g, '</div>')
            .replace(/<active>/g, '<div class="item-active">')
            .replace(/<\/active>/g, '</div>')
            .replace(/<br>/g, '<br/>')
            .replace(/<attention>/g, '<span class="text-attention">')
            .replace(/<\/attention>/g, '</span>')
            .replace(/<groupLimit>/g, '<span class="text-limit">')
            .replace(/<\/groupLimit>/g, '</span>')
            .replace(/<rarityGeneric>/g, '<span class="text-rarity">')
            .replace(/<\/rarityGeneric>/g, '</span>')
            .replace(/<keywordStealth>/g, '<span class="text-keyword">')
            .replace(/<\/keywordStealth>/g, '</span>');
    };

    const style = {
        top: position.y + 15,
        left: position.x + 15,
    };

    // Adjust position if tooltip goes off-screen
    if (position.x + 350 > window.innerWidth) {
        style.left = position.x - 365;
    }
    if (position.y + 450 > window.innerHeight) {
        style.top = position.y - 400;
    }

    return (
        <div className="item-tooltip" style={style}>
            <div className="tooltip-header">
                <div className="item-main-info">
                    <span className="item-name">{item.name}</span>
                    {item.gold && (
                        <div className="item-cost">
                            <img src="/project-icons/item-gold.png" alt="Gold" className="gold-icon" onError={(e) => e.target.style.display = 'none'} />
                            <span>{item.gold.total}</span>
                        </div>
                    )}
                </div>
            </div>
            <div
                className="tooltip-content"
                dangerouslySetInnerHTML={{ __html: formatDescription(item.description) }}
            />
            {item.plaintext && (
                <div className="tooltip-footer">
                    <p className="item-flavor">{item.plaintext}</p>
                </div>
            )}
        </div>
    );
};

export default ItemTooltip;
