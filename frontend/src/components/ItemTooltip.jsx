import React from 'react';
import ReactDOM from 'react-dom';
import '../styles/componentsCSS/itemTooltip.css';

const ItemTooltip = ({ item, position, version }) => {
    const tooltipRef = React.useRef(null);
    const [adjustedStyle, setAdjustedStyle] = React.useState(null);

    if (!item) return null;



    const formatDescription = (description) => {
        if (!description) return '';

        // Helper to replace @Key@ or @Key*Multiplier@ patterns
        const parseVariables = (desc) => {
            return desc.replace(/@([^@]+)@/g, (match, key) => {
                // Format is usually Name or Name*Multiplier
                // e.g. MeleeReduction*100
                let [name, multiplier] = key.split('*');
                multiplier = multiplier ? parseFloat(multiplier) : 1;

                // Try to find the value in item.dataValues presumably (if it exists)
                // or just remove the tag if we can't resolve it, or leave it as a number if we can find it.
                // Since we often don't have the dynamic values in the static list, 
                // we might need to look for matching values in the item object if available.
                // Many CDragon items have dataValues or effectAmount.

                // If we can't find the value, we might want to fail gracefully.
                // For now, let's try to look it up in item.dataValues if available,
                // otherwise, attempt to just show the key name or a simplified version? 
                // Actually, usually these values are dynamic. If we don't have them, we might be stuck.
                // However, the user request says "descirption is weird and it says "@MeleeReduction*100@%"".
                // This implies the literal text is showing.

                // Strategy:
                // 1. Check if `item.dataValues` exists.
                // 2. Look for `name` in `dataValues`.
                // 3. If found, use `value * multiplier`.
                // 4. If NOT found, typically these tags are for dynamic stats. 
                //    If we can't resolve, maybe we strip it or replace with "?"?
                //    Or maybe checking if `item` has properties matching the name (case insensitive).

                // Let's check if item has dataValues (CommunityDragon common format)
                let val = undefined;
                if (item.dataValues) {
                    const dataValue = item.dataValues.find(dv => dv.name.toLowerCase() === name.toLowerCase());
                    if (dataValue) val = dataValue.value;
                }

                if (val === undefined) {
                    // Check if it's in effects
                    // fallback
                    return match; // Keep it if we can't fix it, OR maybe replace with "?"
                }

                return (val * multiplier).toFixed(0); // usually integers for percentages
            });
        };

        // But wait, the user says the description *is* weird. 
        // If we don't have the dataValues, we might just want to clean it up.
        // e.g. "@MeleeReduction*100@%" -> "10%" (if we knew) or just remove the tag?
        // If we assume we DON'T have the values (static JSON often lacks them), 
        // we should probably try to be smart or just strip the weirdness.

        // Better yet, let's look at `item`. If it's from CDragon `augments.json`, it usually has `dataValues`.
        // If not, we might be out of luck.

        // Let's add a generic replacer that tries to look up dataValues, 
        // and if it fails, maybe replaces with a placeholder like "X".

        let formatted = description;

        // Replace CDragon variables
        formatted = formatted.replace(/@([^@]+)@/g, (match, key) => {
            const parts = key.split('*');
            const name = parts[0];
            const mult = parts[1] ? parseFloat(parts[1]) : 1;

            let value = undefined;
            // Logic to find value
            // CommunityDragon augments.json has dataValues as an Object { Key: Value, ... }
            if (item.dataValues) {
                // Check if it's an array (rare/standard ddragon?) or object (CDragon)
                if (Array.isArray(item.dataValues)) {
                    const dv = item.dataValues.find(d => d.name.toLowerCase() === name.toLowerCase());
                    if (dv) value = dv.value;
                } else {
                    // It is an object
                    // Try to find key case-insensitive
                    const keyMatch = Object.keys(item.dataValues).find(k => k.toLowerCase() === name.toLowerCase());
                    if (keyMatch) {
                        value = item.dataValues[keyMatch];
                    }
                }
            }

            if (value === undefined && item[name] !== undefined) {
                // Sometimes directly on object
                value = item[name];
            }

            if (value === undefined) {
                // If we can't find it, we return "??" to indicate missing data rather than the broken tag
                // OR we leave it as valid text if it looks like a variable name, but users hate that.
                // Fallback: If we assume the multipliers are correct, maybe we just strip the variable name?
                // But better to show ?? so we know it's broken.
                return "??";
            }

            // Check if it should be formatted precision
            let finalVal = value * mult;
            // Round to 2 decimals if not integer
            return Number.isInteger(finalVal) ? finalVal : finalVal.toFixed(1);
        });

        return formatted
            .replace(/<stats>/g, '<span class="item-stats">')
            .replace(/<\/stats>/g, '</span><br/>')
            .replace(/<passive>/g, '<span class="item-passive">')
            .replace(/<\/passive>/g, '</span>')
            .replace(/<active>/g, '<span class="item-active">')
            .replace(/<\/active>/g, '</span>')
            .replace(/<br>/g, '<br/>')
            .replace(/<attention>/g, '<span class="text-attention">')
            .replace(/<\/attention>/g, '</span>')
            // CDragon sometimes uses these
            .replace(/<groupLimit>/g, '<span class="text-limit">')
            .replace(/<\/groupLimit>/g, '</span>')
            .replace(/<rarityGeneric>/g, '<span class="text-rarity">')
            .replace(/<\/rarityGeneric>/g, '</span>')
            .replace(/<keywordStealth>/g, '<span class="text-keyword">')
            .replace(/<\/keywordStealth>/g, '</span>')
            .replace(/<speed>/g, '<span class="text-speed">')
            .replace(/<\/speed>/g, '</span>')
            .replace(/<status>/g, '<span class="text-status">')
            .replace(/<\/status>/g, '</span>')
            // New lines
            .replace(/\\n/g, '<br/>');
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
    } else if (item.type === 'summoner') {
        imageUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${item.image.full}`;
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
                                <img src="/Gold Icon.png" alt="Gold" className="gold-icon" onError={(e) => e.target.style.display = 'none'} />
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
