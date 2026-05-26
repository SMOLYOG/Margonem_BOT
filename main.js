// ==UserScript==
// @name         Margonem Bot v8
// @namespace    http://tampermonkey.net/
// @version      8.4
// @description  Auto farm + hero/elite search + auto heal | SI + NI | modularny, z persystencją
// @author
// @match        https://gordion.margonem.pl/
// @match        https://*.margonem.pl/*
// @grant        none
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/config.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/storage.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/adapter.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/bot.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/ui.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/inventory.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/combat.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/heal.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/farm.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/search.js?v=5
// ==/UserScript==

(function () {
    'use strict';

    // Buduj UI
    MBot.ui.build();

    // Oznacz interfejs w headerze
    if (MBot.adapter.isNI) {
        document.getElementById('mbot-header-title').textContent = '⚔️ Margonem Bot [NI]';
    }

    // Przywróć zapisane ustawienia do pól formularza
    const mobMin  = MBot.storage.get('mobMinLevel');
    const mobMax  = MBot.storage.get('mobMaxLevel');
    const mobName = MBot.storage.get('mobName');
    if (mobMin)  document.getElementById('mob-min-level').value = mobMin;
    if (mobMax)  document.getElementById('mob-max-level').value = mobMax;
    if (mobName) document.getElementById('mob-name').value = mobName;

    document.getElementById('heal-threshold').value = MBot.bot.healThreshold;

    const heroesInput = MBot.storage.get('heroesInput');
    const elitesInput = MBot.storage.get('elitesInput');
    if (heroesInput) document.getElementById('heroes-input').value = heroesInput;
    if (elitesInput) document.getElementById('elites-input').value = elitesInput;

    const gwEnabled = MBot.storage.get('gatewayEnabled');
    const gwDest    = MBot.storage.get('gatewayDest');
    if (gwEnabled) document.getElementById('gateway-enabled').checked = true;
    if (gwDest)    document.getElementById('gateway-dest').value = gwDest;

    // W NI: rejestruj callback na koniec walki (auto-heal po battle)
    MBot.adapter.onBattleClose(() => MBot.heal.autoHeal());

    // Przyciski Farm
    document.getElementById('start-farm').addEventListener('click', () => MBot.farm.start());
    document.getElementById('stop-farm') .addEventListener('click', () => MBot.bot.stop());

    // Przyciski Search
    document.getElementById('start-search').addEventListener('click', () => MBot.search.start());
    document.getElementById('stop-search') .addEventListener('click', () => MBot.bot.stop());

    // Heal panel
    document.getElementById('refresh-inv').addEventListener('click', () => MBot.inventory.render());

    document.getElementById('save-heal-settings').addEventListener('click', () => {
        const threshold = parseInt(document.getElementById('heal-threshold').value) || 30;
        MBot.bot.healThreshold = threshold;
        MBot.storage.set('healThreshold', threshold);
        const notice = document.getElementById('heal-save-notice');
        notice.style.display = 'block';
        setTimeout(() => { notice.style.display = 'none'; }, 2000);
    });

    // Auto-restart po przeładowaniu strony (np. po przejściu przez bramę)
    const savedMode = MBot.storage.get('botMode');
    if (savedMode === 'farm') {
        setTimeout(() => MBot.farm.start(), 2000);
    } else if (savedMode === 'search') {
        setTimeout(() => MBot.search.start(), 2000);
    }

})();
