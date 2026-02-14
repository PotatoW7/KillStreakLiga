import React from 'react';
import ReactDOM from 'react-dom';
import '../styles/componentsCSS/itemTooltip.css';

const ItemTooltip = ({ item, position, version }) => {
    const tooltipRef = React.useRef(null);
    const [adjustedStyle, setAdjustedStyle] = React.useState(null);

    if (!item) return null;



    const formatDescription = (description) => {
        if (!description) return '';
        return description
            .replace(/<stats>/g, '<span class="item-stats">')
            .replace(/<\/stats>/g, '</span><br/>')
            .replace(/<passive>/g, '<span class="item-passive">')
            .replace(/<\/passive>/g, '</span>')
            .replace(/<active>/g, '<span class="item-active">')
            .replace(/<\/active>/g, '</span>')
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


    const baseStyle = {
        position: 'fixed',
        zIndex: 10001,
        left: position.x + 15,
        top: position.y + 15,
    };


    React.useEffect(() => {
        if (tooltipRef.current) {
            const rect = tooltipRef.current.getBoundingClientRect();
            const style = {
                position: 'fixed',
                zIndex: 10001,
            };


            if (position.x + rect.width + 15 > window.innerWidth) {
                style.right = window.innerWidth - position.x + 15;
                style.left = 'auto';
            } else {
                style.left = position.x + 15;
            }


            if (position.y + rect.height + 15 > window.innerHeight) {
                style.top = Math.max(5, position.y - rect.height - 10);
            } else {
                style.top = position.y + 15;
            }

            setAdjustedStyle(style);
        }
    }, [position.x, position.y]);

    let imageUrl = null;

    if (item.type === 'rune') {
        imageUrl = `https://ddragon.leagueoflegends.com/cdn/img/${item.icon}`;
    } else if (item.image && version) {
        imageUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.image.full}`;
    }

    return ReactDOM.createPortal(
        <div className="item-tooltip" ref={tooltipRef} style={adjustedStyle || baseStyle}>
            <div className="tooltip-header" style={{ display: 'flex', alignItems: 'flex-start' }}>
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt={item.name}
                        className="item-tooltip-image"
                        style={{ width: '48px', height: '48px', marginRight: '12px', borderRadius: '4px', border: '1px solid #785a28', objectFit: 'cover' }}
                        onError={(e) => {

                            if (item.type === 'rune') e.target.src = "/runes/unknown.png";
                            else e.target.style.display = 'none';
                        }}
                    />
                )}
                <div className="item-main-info" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <span className="item-name">{item.name}</span>
                        {item.gold && (
                            <div className="item-cost">
                                <img src="/project-icons/item-gold.png" alt="Gold" className="gold-icon" onError={(e) => e.target.style.display = 'none'} />
                                <span>{item.gold.total}</span>
                            </div>
                        )}
                    </div>
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
        </div>,
        document.body
    );
};

export default ItemTooltip;
