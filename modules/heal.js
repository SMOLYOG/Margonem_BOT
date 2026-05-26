MBot.heal = (() => {
    return {
        autoHeal() {
            const hp = MBot.adapter.readHP();
            MBot.ui.updateHP(hp);

            if (hp === null || hp > MBot.bot.healThreshold) return;

            const now = Date.now();
            if (now - MBot.bot.lastHealTime < MBot.config.HEAL_COOLDOWN_MS) return;

            const { healItemId } = MBot.bot;
            if (!healItemId) return;

            if (!MBot.adapter.itemExists(healItemId)) {
                console.warn('[BOT] Przedmiot zniknął z EQ (zużyty?).');
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
