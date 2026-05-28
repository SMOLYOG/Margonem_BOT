MBot.inventory = (() => {
    function updatePreview(name, imgSrc) {
        const label = document.getElementById('heal-item-label');
        const img   = document.getElementById('heal-item-img');
        label.textContent = name || 'Wybrany przedmiot';
        label.style.color = '#8f8';
        if (imgSrc) { img.src = imgSrc; img.style.display = 'inline'; }
        else { img.style.display = 'none'; }
    }

    function buildSlot(item, grid) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.title = item.name || item.id;

        if (item.id && item.id === MBot.bot.healItemId) {
            slot.classList.add('selected');
            if (item.el) MBot.bot.healSlotEl = item.el;
            updatePreview(item.name, item.imgSrc);
        }

        if (item.imgSrc) {
            const i = document.createElement('img');
            i.src = item.imgSrc;
            slot.appendChild(i);
        } else if (item.name) {
            // NI: brak obrazka — pokaż inicjały nazwy
            const abbr = document.createElement('span');
            abbr.textContent = item.name.slice(0, 2).toUpperCase();
            abbr.style.cssText = 'font-size:10px;color:#ccc;text-align:center;word-break:break-all;';
            slot.appendChild(abbr);
        }

        if (item.amount && String(item.amount) !== '1') {
            const badge = document.createElement('span');
            badge.className = 'amount';
            badge.textContent = item.amount;
            slot.appendChild(badge);
        }

        slot.addEventListener('click', () => {
            grid.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
            slot.classList.add('selected');
            MBot.bot.healSlotEl = item.el || null;
            MBot.bot.healItemId = item.id;
            MBot.bot.healItemName = item.name || null;
            MBot.storage.set('healItemId', item.id);
            MBot.storage.set('healItemName', item.name || null);
            updatePreview(item.name, item.imgSrc);
        });

        return slot;
    }

    return {
        // extractNameFromTip przeniesiony do adapter.js
        extractNameFromTip: (tip) => MBot.adapter.extractNameFromTip(tip),

        clearPreview() {
            document.getElementById('heal-item-label').textContent = '⚠️ Przedmiot zużyty — wybierz nowy';
            document.getElementById('heal-item-label').style.color = '#f88';
            document.getElementById('heal-item-img').style.display = 'none';
        },

        render() {
            const grid = document.getElementById('inv-grid');
            grid.innerHTML = '';

            const items = MBot.adapter.getInventoryItems();

            if (!items.length) {
                grid.innerHTML = `<div style="grid-column:span 5;color:#666;font-size:11px;padding:4px;">
                    ${MBot.adapter.isNI
                        ? 'Brak przedmiotów w ekwipunku.'
                        : 'Brak przedmiotów — otwórz ekwipunek w grze.'}
                </div>`;
                return;
            }

            items.forEach(item => grid.appendChild(buildSlot(item, grid)));
        }
    };
})();
