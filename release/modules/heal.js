MBot.heal = (() => {
    return {
        autoHeal() {
            const hp = MBot.adapter.readHP();
            MBot.ui.updateHP(hp);
            if (hp === null || hp > MBot.bot.healThreshold) return;

            const now = Date.now();
            if (now - MBot.bot.lastHealTime < MBot.config.HEAL_COOLDOWN_MS) return;

            let { healItemId } = MBot.bot;

            // Jeśli brak ID lub item zniknął — szukaj po nazwie (drugi stack)
            if (!healItemId || !MBot.adapter.itemExists(healItemId)) {
                const healItemName = MBot.bot.healItemName || MBot.storage.get('healItemName');
                if (healItemName) {
                    const found = MBot.adapter.getInventoryItems().find(i => i.name === healItemName);
                    if (found) {
                        console.log(`[BOT] Zamiennik: ${found.name} (id: ${found.id})`);
                        MBot.bot.healItemId = found.id;
                        MBot.storage.set('healItemId', found.id);
                        healItemId = found.id;
                        MBot.inventory.render();
                    }
                }
            }

            if (!healItemId) return;

            if (!MBot.adapter.itemExists(healItemId)) {
                console.warn('[BOT] Przedmiot zniknął z EQ — brak zamiennika o tej nazwie.');
                MBot.bot.healSlotEl = null;
                MBot.bot.healItemId = null;
                MBot.storage.set('healItemId', null);
                MBot.inventory.clearPreview();
                MBot.inventory.render();
                return;
            }

            MBot.bot.lastHealTime = now;
            console.log(`[BOT] HP ${hp}% — leczę (id: ${healItemId})`);
            MBot.adapter.useItem(healItemId);
        }
    };
})();
