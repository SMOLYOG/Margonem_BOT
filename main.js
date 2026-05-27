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
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/storage.js?v=6
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/adapter.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/bot.js?v=6
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/ui.js?v=7
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/inventory.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/combat.js?v=6
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/heal.js?v=5
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/farm.js?v=6
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/route.js?v=2
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/modules/captcha.js?v=2
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

    // Wczytaj zapisane etapy route i wyświetl
    MBot.route.loadFromStorage();
    MBot.ui.renderRouteSteps(MBot.route.getSteps());

    // W NI: rejestruj callback na koniec walki (auto-heal po battle)
    MBot.adapter.onBattleClose(() => MBot.heal.autoHeal());

    // Przyciski Farm
    document.getElementById('start-farm').addEventListener('click', () => MBot.farm.start());
    document.getElementById('stop-farm') .addEventListener('click', () => MBot.bot.stop());

    // Przyciski Route — builder
    document.getElementById('scan-mobs').addEventListener('click', () => {
        MBot.ui.renderRouteMobs(MBot.route.scanMobs());
    });
    document.getElementById('scan-gateways').addEventListener('click', () => {
        MBot.ui.renderRouteGateways(MBot.route.scanGateways());
    });
    document.getElementById('add-route-step').addEventListener('click', () => {
        const checked = [...document.querySelectorAll('#route-mob-list input[type=checkbox]:checked')]
            .map(cb => cb.value);
        if (checked.length === 0) return;
        const gw = document.getElementById('route-gateway-select').value;
        MBot.route.addStep(checked, gw);
        MBot.ui.renderRouteSteps(MBot.route.getSteps());
        // Wyczyść builder po dodaniu
        MBot.ui.renderRouteMobs(null);
        MBot.ui.renderRouteGateways([]);
    });

    // Delegowane usuwanie etapów
    document.getElementById('route-steps-list').addEventListener('click', e => {
        const btn = e.target.closest('.route-step-del');
        if (!btn) return;
        MBot.route.removeStep(parseInt(btn.dataset.index));
        MBot.ui.renderRouteSteps(MBot.route.getSteps());
    });

    // Start / Stop / Wyczyść Route
    document.getElementById('start-route').addEventListener('click', () => {
        MBot.route.start();
        MBot.ui.renderRouteSteps(MBot.route.getSteps());
    });
    document.getElementById('stop-route').addEventListener('click', () => MBot.bot.stop());
    document.getElementById('clear-route').addEventListener('click', () => {
        MBot.route.clearSteps();
        MBot.ui.renderRouteSteps([]);
    });

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
    const savedMode = MBot.storage.get('botMode');
    if (savedMode === 'farm') {
        setTimeout(() => MBot.farm.start(), 2000);
    } else if (savedMode === 'route') {
        setTimeout(() => {
            // Etapy już wczytane przez loadFromStorage() powyżej
            MBot.ui.switchTab('route');
            MBot.route.start();
            MBot.ui.renderRouteSteps(MBot.route.getSteps());
        }, 2000);
    }

})();
