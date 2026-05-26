// ==UserScript==
// @name         Margonem Bot v8
// @namespace    http://tampermonkey.net/
// @version      8.1
// @description  Auto farm + hero/elite search + auto heal | SI + NI | modularny, z persystencją
// @author
// @match        https://gordion.margonem.pl/
// @match        https://*.margonem.pl/*
// @grant        none
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/config.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/storage.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/adapter.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/bot.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/ui.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/inventory.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/combat.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/heal.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/farm.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/search.js
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

})();
