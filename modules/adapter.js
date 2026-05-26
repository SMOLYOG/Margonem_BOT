MBot.adapter = (() => {
    // Wykrywa interfejs po obecności elementu canvas gry
    const IFACE = document.getElementById('GAME_CANVAS') ? 'ni' : 'si';

    function extractNameFromTip(tip) {
        if (!tip) return null;
        const tmp = document.createElement('div');
        tmp.innerHTML = tip;
        const nameEl = tmp.querySelector('.tip-item-stat-item-name');
        if (nameEl) return nameEl.textContent.trim();
        const b = tmp.querySelector('b');
        return b ? b.textContent.trim() : null;
    }

    return {
        IFACE,
        isNI: IFACE === 'ni',
        isSI: IFACE === 'si',
        extractNameFromTip,

        readHP() {
            if (IFACE === 'ni') {
                try {
                    const { hp, maxhp } = Engine.hero.d.warrior_stats;
                    if (!maxhp) return null;
                    return Math.round((hp / maxhp) * 100);
                } catch { return null; }
            }
            const life1 = document.getElementById('life1');
            if (!life1) return null;
            const match = (life1.getAttribute('tip') || '').match(/([\d\s]+)\s*\/\s*([\d\s]+)/);
            if (!match) return null;
            const current = parseInt(match[1].replace(/\s/g, ''));
            const max     = parseInt(match[2].replace(/\s/g, ''));
            if (!max || isNaN(current)) return null;
            return Math.round((current / max) * 100);
        },

        useItem(itemId) {
            if (IFACE === 'ni') {
                window._g(`moveitem&st=1&id=${itemId}`);
                return;
            }
            if (typeof moveItemSafe === 'function') {
                moveItemSafe(itemId, 'st=1');
            } else {
                const el = document.getElementById('item' + itemId);
                if (el) $(el).trigger('dblclick');
            }
        },

        itemExists(itemId) {
            if (IFACE === 'ni') {
                try {
                    return Engine.items.fetchLocationItems('g').some(i => String(i.id) === String(itemId));
                } catch { return false; }
            }
            return !!(window.g?.item?.[itemId]);
        },

        getInventoryItems() {
            if (IFACE === 'ni') {
                try {
                    return Engine.items.fetchLocationItems('g').map(item => ({
                        id: String(item.id),
                        name: item.name,
                        imgSrc: null,
                        amount: item._cachedStats?.amount ?? null,
                        el: null
                    }));
                } catch { return []; }
            }
            const result = [];
            document.querySelectorAll('div.item[data-type="t_item"]').forEach(el => {
                const rawId = el.id ? el.id.replace('item', '') : null;
                const img   = el.querySelector('img');
                const small = el.querySelector('small');
                result.push({
                    id: rawId,
                    name: extractNameFromTip(el.getAttribute('tip')),
                    imgSrc: img ? img.src : null,
                    amount: small ? small.textContent.trim() : null,
                    el
                });
            });
            return result;
        },

        onBattleClose(fn) {
            if (IFACE === 'ni' && window.API?.addCallbackToEvent) {
                window.API.addCallbackToEvent('close_battle', () => {
                    setTimeout(() => {
                        MBot.bot.inBattle = false;
                        fn();
                    }, 250);
                });
            }
        }
    };
})();
