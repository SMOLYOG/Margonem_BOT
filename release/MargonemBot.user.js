// ==UserScript==
// @name         Margonem Bot
// @namespace    https://github.com/SMOLYOG/Margonem_BOT
// @version      1.1.0
// @description  Auto farm | Wieloetapowy Route | Auto Heal | Auto CAPTCHA | SI + NI
// @author       SMOLYOG
// @match        https://*.margonem.pl/*
// @grant        none
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/config.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/storage.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/adapter.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/bot.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/ui.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/inventory.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/combat.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/heal.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/farm.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/route.js
// @require      https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/modules/captcha.js
// ==/UserScript==

(function () {
    'use strict';

    if (document.getElementById('mbot-root')) return;
    window.MBot = window.MBot || {};

    // ── Buduj UI ──────────────────────────────────────────────────────────
    MBot.ui.build();

    if (MBot.adapter.isNI) {
        document.getElementById('mbot-header-title').textContent = '⚔️ Margonem Bot [NI]';
    }

    // ── Przywróć ustawienia ───────────────────────────────────────────────
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

    MBot.route.loadFromStorage();
    MBot.ui.renderRouteSteps(MBot.route.getSteps());

    MBot.adapter.onBattleClose(() => MBot.heal.autoHeal());

    // ── Farm ──────────────────────────────────────────────────────────────
    document.getElementById('start-farm').addEventListener('click', () => MBot.farm.start());
    document.getElementById('stop-farm') .addEventListener('click', () => MBot.bot.stop());

    // ── Route ─────────────────────────────────────────────────────────────
    document.getElementById('scan-mobs').addEventListener('click', () => {
        MBot.ui.renderRouteMobs(MBot.route.scanMobs());
    });
    document.getElementById('scan-gateways').addEventListener('click', () => {
        MBot.ui.renderRouteGateways(MBot.route.scanGateways());
    });
    document.getElementById('add-route-step').addEventListener('click', () => {
        const checked = [...document.querySelectorAll('#route-mob-list input[type=checkbox]:checked')]
            .map(cb => cb.value);
        const gw = document.getElementById('route-gateway-select').value;
        if (checked.length === 0 && !gw) return;
        MBot.route.addStep(checked, gw);
        MBot.ui.renderRouteSteps(MBot.route.getSteps());
        MBot.ui.renderRouteMobs(null);
        MBot.ui.renderRouteGateways([]);
    });
    document.getElementById('route-steps-list').addEventListener('click', e => {
        const btn = e.target.closest('.route-step-del');
        if (!btn) return;
        MBot.route.removeStep(parseInt(btn.dataset.index));
        MBot.ui.renderRouteSteps(MBot.route.getSteps());
    });
    document.getElementById('route-step-prev').addEventListener('click', () => {
        const steps = MBot.route.getSteps();
        const cur   = steps.find(s => s.active)?.index ?? 0;
        MBot.route.setStep((cur - 1 + steps.length) % steps.length);
    });
    document.getElementById('route-step-next').addEventListener('click', () => {
        const steps = MBot.route.getSteps();
        const cur   = steps.find(s => s.active)?.index ?? 0;
        MBot.route.setStep((cur + 1) % steps.length);
    });

    document.getElementById('start-route').addEventListener('click', () => {
        MBot.route.start();
        MBot.ui.renderRouteSteps(MBot.route.getSteps());
    });
    document.getElementById('stop-route') .addEventListener('click', () => MBot.bot.stop());
    document.getElementById('clear-route').addEventListener('click', () => {
        MBot.route.clearSteps();
        MBot.ui.renderRouteSteps([]);
    });

    // ── Heal ──────────────────────────────────────────────────────────────
    document.getElementById('refresh-inv').addEventListener('click', () => MBot.inventory.render());
    document.getElementById('save-heal-settings').addEventListener('click', () => {
        const threshold = parseInt(document.getElementById('heal-threshold').value) || 30;
        MBot.bot.healThreshold = threshold;
        MBot.storage.set('healThreshold', threshold);
        const notice = document.getElementById('heal-save-notice');
        notice.style.display = 'block';
        setTimeout(() => { notice.style.display = 'none'; }, 2000);
    });

    // ── CAPTCHA ───────────────────────────────────────────────────────────
    const captchaToggle = document.getElementById('captcha-toggle');
    let captchaActive = !!MBot.storage.get('captchaEnabled');

    function _setCaptchaState(active) {
        captchaActive = active;
        MBot.storage.set('captchaEnabled', active ? 1 : 0);
        if (active) {
            MBot.captcha.start();
            captchaToggle.textContent = '■ Wyłącz auto-CAPTCHA';
            captchaToggle.classList.add('active');
        } else {
            MBot.captcha.stop();
            captchaToggle.textContent = '▶ Włącz auto-CAPTCHA';
            captchaToggle.classList.remove('active');
        }
    }

    captchaToggle.addEventListener('click', () => _setCaptchaState(!captchaActive));
    _setCaptchaState(captchaActive);

    // ── Auto-restart po przeładowaniu strony ──────────────────────────────
    const savedMode = MBot.storage.get('botMode');
    if (savedMode === 'farm') {
        setTimeout(() => MBot.farm.start(), 2000);
    } else if (savedMode === 'route') {
        setTimeout(() => {
            MBot.ui.switchTab('route');
            MBot.route.start();
            MBot.ui.renderRouteSteps(MBot.route.getSteps());
        }, 2000);
    }

})();
