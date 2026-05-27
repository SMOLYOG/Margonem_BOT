MBot.captcha = (() => {
    let _observer = null;
    let _solving = false;

    function _log(msg) { console.log('[MBot CAPTCHA]', msg); }
    function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function _inspectGlobal(name) {
        const val = window[name];
        if (val === undefined) { _log(`${name}: brak`); return; }
        const type = typeof val;
        if (type === 'function') {
            const proto = Object.getOwnPropertyNames(val.prototype || {});
            _log(`${name} [class/fn] proto: ${proto.join(', ')}`);
        } else if (type === 'object' && val !== null) {
            const keys = Object.keys(val);
            _log(`${name} [object] keys: ${keys.join(', ')}`);
            keys.slice(0, 15).forEach(k => {
                const v = val[k];
                const t = typeof v;
                if (t === 'function') _log(`  .${k}() fn`);
                else if (t === 'object' && v !== null) _log(`  .${k} = {${Object.keys(v).slice(0,5).join(',')}}`);
                else _log(`  .${k} = ${String(v).slice(0, 60)}`);
            });
        } else {
            _log(`${name} = ${String(val).slice(0, 100)}`);
        }
    }

    function _isAsterisk(btn) {
        const span = btn.querySelector('span.gfont');
        if (!span) return false;
        const name = span.getAttribute('name') || '';
        return name.startsWith('*') && name.endsWith('*');
    }

    async function _solveCaptcha() {
        if (_solving) return;
        _solving = true;
        _log('=== Rozwiązuję CAPTCHA ===');
        try {
            const container = document.querySelector('.captcha__buttons');
            if (!container) { _log('Brak .captcha__buttons'); _solving = false; return; }

            // Zbierz zaznaczone przyciski
            const buttons = container.querySelectorAll('.btn.btn-wood');
            const asteriskBtns = [...buttons].filter(_isAsterisk);
            const asteriskNames = asteriskBtns.map(b => b.querySelector('span.gfont').getAttribute('name'));
            _log(`${buttons.length} przycisków, gwiazdki: ${asteriskNames.join(', ')}`);

            // Zaloguj strukturę globalnych obiektów captcha
            ['captcha', 'CaptchaAnswerWaiter', 'initCaptcha', 'preCaptcha', 'idleCaptchaRequest'].forEach(_inspectGlobal);

            // Próbuj wywołać API gry bezpośrednio
            let solved = false;

            // Strategia 1: window.captcha jako obiekt z metodami
            const c = window.captcha;
            if (c && typeof c === 'object') {
                _log('Próba captcha.* ...');
                const methods = ['answer', 'select', 'selectAll', 'submit', 'confirm', 'solve', 'check'];
                for (const m of methods) {
                    if (typeof c[m] === 'function') {
                        _log(`Wywołuję captcha.${m}(...)`);
                        try { c[m](asteriskNames); solved = true; break; } catch(e) { _log(`  błąd: ${e.message}`); }
                    }
                }
                // Spróbuj ustawić właściwość z zaznaczeniem
                if (!solved && c.selected !== undefined) {
                    _log('Ustawiam captcha.selected');
                    try { c.selected = asteriskNames; } catch(e) {}
                }
            }

            // Strategia 2: CaptchaAnswerWaiter jako klasa z instancją
            const CAW = window.CaptchaAnswerWaiter;
            if (CAW) {
                if (typeof CAW === 'function') {
                    try {
                        _log('Próba new CaptchaAnswerWaiter(...)');
                        const inst = new CAW(asteriskNames);
                        _log('  instancja keys: ' + Object.keys(inst).join(', '));
                    } catch(e) { _log('  błąd: ' + e.message); }
                } else if (typeof CAW === 'object') {
                    _log('CaptchaAnswerWaiter [instance] keys: ' + Object.keys(CAW).join(', '));
                }
            }

            // Strategia 3: Klikaj DOM elementami (fallback) — wszystkie możliwe sposoby
            _log('Fallback: klikanie DOM...');
            for (const btn of asteriskBtns) {
                const label = btn.querySelector('.label') || btn;
                const r = label.getBoundingClientRect();
                const x = r.left + r.width / 2, y = r.top + r.height / 2;
                const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
                if (window.jQuery) try { window.jQuery(label).trigger('click'); } catch(e) {}
                if (window.jQuery) try { window.jQuery(btn).trigger('click'); } catch(e) {}
                try { label.click(); } catch(e) {}
                try { btn.click(); } catch(e) {}
                label.dispatchEvent(new MouseEvent('click', opts));
                btn.dispatchEvent(new MouseEvent('click', opts));
                const top = document.elementFromPoint(x, y);
                if (top && top !== label && top !== btn) {
                    _log(`  elementFromPoint: ${top.tagName}.${top.className}`);
                    top.dispatchEvent(new MouseEvent('click', opts));
                    if (window.jQuery) try { window.jQuery(top).trigger('click'); } catch(e) {}
                }
                await _delay(200);
            }

            await _delay(500);

            // Potwierdzam
            const confirmBtn = document.querySelector('.captcha__confirm .btn.btn-wood');
            if (confirmBtn) {
                _log('Klikam "Potwierdzam"');
                // Próbuj przez API gry
                if (c && typeof c.confirm === 'function') { try { c.confirm(); } catch(e) {} }
                if (c && typeof c.submit === 'function') { try { c.submit(); } catch(e) {} }
                // Fallback DOM
                const lbl = confirmBtn.querySelector('.label') || confirmBtn;
                if (window.jQuery) try { window.jQuery(lbl).trigger('click'); } catch(e) {}
                try { lbl.click(); } catch(e) {}
                const r = lbl.getBoundingClientRect();
                lbl.dispatchEvent(new MouseEvent('click', {
                    bubbles: true, cancelable: true, view: window,
                    clientX: r.left + r.width/2, clientY: r.top + r.height/2
                }));
            }
        } catch (err) {
            _log('Błąd: ' + err.message);
        }
        await _delay(5000);
        _solving = false;
    }

    async function _handleSolveNow(span) {
        _solving = true;
        _log('Klikam "Rozwiąż teraz"...');
        const label = span.closest('.label') || span.parentElement;
        const el = label || span;
        if (window.jQuery) try { window.jQuery(el).trigger('click'); } catch(e) {}
        try { el.click(); } catch(e) {}
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('click', {
            bubbles: true, cancelable: true, view: window,
            clientX: r.left + r.width/2, clientY: r.top + r.height/2
        }));
        for (let i = 0; i < 30; i++) {
            await _delay(250);
            if (document.querySelector('.captcha__buttons')) {
                await _delay(1500);
                _solving = false;
                await _solveCaptcha();
                return;
            }
        }
        _log('Timeout: .captcha__buttons nie pojawiło się');
        _solving = false;
    }

    function _check() {
        if (_solving) return;
        const solveNow = [...document.querySelectorAll('span.gfont')].find(
            s => s.getAttribute('name') === 'Rozwiąż teraz'
        );
        if (solveNow && solveNow.offsetParent !== null) {
            _handleSolveNow(solveNow);
            return;
        }
        const container = document.querySelector('.captcha__buttons');
        if (container && container.offsetParent !== null) {
            _solveCaptcha();
        }
    }

    return {
        start() {
            if (_observer) return;
            _log('Obserwator CAPTCHA uruchomiony');
            _observer = new MutationObserver(_check);
            _observer.observe(document.body, { childList: true, subtree: true });
            _check();
        },
        stop() {
            if (_observer) { _observer.disconnect(); _observer = null; _log('Obserwator zatrzymany'); }
        }
    };
})();
