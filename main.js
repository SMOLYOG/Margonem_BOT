// ==UserScript==
// @name         Margonem Bot v8
// @namespace    http://tampermonkey.net/
// @version      9.0
// @description  Auto farm + route/expowisko + auto heal + CAPTCHA solver | SI + NI | modularny, z persystencją
// @author
// @match        https://gordion.margonem.pl/
// @match        https://*.margonem.pl/*
// @grant        none
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/config.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/storage.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/adapter.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/bot.js?v=6
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/ui.js?v=6
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/inventory.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/combat.js?v=6
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/heal.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/farm.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/route.js?v=1
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/captcha.js?v=1
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

    const gwEnabled = MBot.storage.get('gatewayEnabled');
    const gwDest    = MBot.storage.get('gatewayDest');
    if (gwEnabled) document.getElementById('gateway-enabled').checked = true;
    if (gwDest)    document.getElementById('gateway-dest').value = gwDest;

    // W NI: rejestruj callback na koniec walki (auto-heal po battle)
    MBot.adapter.onBattleClose(() => MBot.heal.autoHeal());

    // Przyciski Farm
    document.getElementById('start-farm').addEventListener('click', () => MBot.farm.start());
    document.getElementById('stop-farm') .addEventListener('click', () => MBot.bot.stop());

    // Przyciski Route
    document.getElementById('scan-mobs').addEventListener('click', () => {
        const mobs = MBot.route.scanMobs();
        MBot.ui.renderRouteMobs(mobs);
    });
    document.getElementById('scan-gateways').addEventListener('click', () => {
        const gws = MBot.route.scanGateways();
        MBot.ui.renderRouteGateways(gws);
    });
    document.getElementById('start-route').addEventListener('click', () => {
        const checked = [...document.querySelectorAll('#route-mob-list input[type=checkbox]:checked')]
            .map(cb => cb.value);
        const gw = document.getElementById('route-gateway-select').value;
        MBot.route.setSelectedMobs(checked);
        MBot.route.setSelectedGateway(gw);
        MBot.route.start();
    });
    document.getElementById('stop-route').addEventListener('click', () => MBot.bot.stop());

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

    // CAPTCHA solver — uruchom obserwatora od razu
    MBot.captcha.start();

    // Przycisk CAPTCHA w UI
    document.getElementById('captcha-toggle').addEventListener('click', () => {
        const btn = document.getElementById('captcha-toggle');
        if (btn.dataset.active === '1') {
            MBot.captcha.stop();
            btn.dataset.active = '0';
            btn.textContent = '▶ Włącz auto-CAPTCHA';
            btn.classList.remove('active');
        } else {
            MBot.captcha.start();
            btn.dataset.active = '1';
            btn.textContent = '■ Wyłącz auto-CAPTCHA';
            btn.classList.add('active');
        }
    });

    // Auto-restart po przeładowaniu strony (np. po przejściu przez bramę)
    // Route mode wymaga wyboru mobów — nie restartuje automatycznie
    const savedMode = MBot.storage.get('botMode');
    if (savedMode === 'farm') {
        setTimeout(() => MBot.farm.start(), 2000);
    }

})();
