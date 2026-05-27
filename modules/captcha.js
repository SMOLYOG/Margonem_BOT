MBot.captcha = (() => {
    let _observer = null;
    let _solving = false;

    function _log(msg) { console.log('[MBot CAPTCHA]', msg); }
    function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function _tryAll(el) {
        const r = el.getBoundingClientRect();
        const x = r.left + r.width  / 2;
        const y = r.top  + r.height / 2;
        const base = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
        const pb   = { ...base, pointerId: 1, isPrimary: true };

        // 1. jQuery trigger na tym elemencie
        if (window.jQuery) {
            try { window.jQuery(el).trigger('click'); } catch(e) {}
        }
        // 2. Natywne .click()
        try { el.click(); } catch(e) {}
        // 3. Pełna sekwencja pointer + mouse events
        try { el.dispatchEvent(new PointerEvent('pointerdown', pb)); } catch(e) {}
        el.dispatchEvent(new MouseEvent('mousedown', base));
        try { el.dispatchEvent(new PointerEvent('pointerup',   pb)); } catch(e) {}
        el.dispatchEvent(new MouseEvent('mouseup',   base));
        el.dispatchEvent(new MouseEvent('click',     base));
        // 4. Click na elemencie pod kursorem (na wypadek overlaya)
        const top = document.elementFromPoint(x, y);
        if (top && top !== el) {
            if (window.jQuery) try { window.jQuery(top).trigger('click'); } catch(e) {}
            try { top.click(); } catch(e) {}
            top.dispatchEvent(new MouseEvent('click', base));
        }
    }

    function _isAsterisk(btn) {
        const span = btn.querySelector('span.gfont');
        if (!span) return false;
        const name = span.getAttribute('name') || '';
        return name.startsWith('*') && name.endsWith('*');
    }

    function _debugBindings(container) {
        if (!window.jQuery) { _log('jQuery niedostępne'); return; }
        try {
            const conEv = window.jQuery._data(container, 'events') || {};
            _log('Eventy na .captcha__buttons: ' + (Object.keys(conEv).join(', ') || 'brak'));
            const btn = container.querySelector('.btn');
            if (btn) {
                const btnEv = window.jQuery._data(btn, 'events') || {};
                _log('Eventy na .btn: ' + (Object.keys(btnEv).join(', ') || 'brak'));
                const label = btn.querySelector('.label');
                if (label) {
                    const labEv = window.jQuery._data(label, 'events') || {};
                    _log('Eventy na .label: ' + (Object.keys(labEv).join(', ') || 'brak'));
                }
            }
            // Szukaj globalnych obiektów captcha
            const globs = Object.keys(window).filter(k =>
                /captcha|quiz|puzzle/i.test(k)
            );
            _log('Globale captcha: ' + (globs.join(', ') || 'brak'));
        } catch(e) { _log('Debug error: ' + e.message); }
    }

    async function _solveCaptcha() {
        if (_solving) return;
        _solving = true;
        _log('Rozwiązuję CAPTCHA...');
        try {
            const container = document.querySelector('.captcha__buttons');
            if (!container) { _log('Brak .captcha__buttons'); _solving = false; return; }

            _debugBindings(container);

            const buttons = container.querySelectorAll('.btn.btn-wood');
            _log(`${buttons.length} przycisków`);

            for (const btn of buttons) {
                if (_isAsterisk(btn)) {
                    const name = btn.querySelector('span.gfont')?.getAttribute('name');
                    _log('* klik: ' + name);
                    const label = btn.querySelector('.label') || btn;
                    // Klikamy .label, potem .btn, potem span — pełna siłownia
                    _tryAll(label);
                    await _delay(100);
                    _tryAll(btn);
                    await _delay(300);
                }
            }

            await _delay(500);

            const confirmBtn = document.querySelector('.captcha__confirm .btn.btn-wood');
            if (confirmBtn) {
                _log('Klikam "Potwierdzam"');
                const label = confirmBtn.querySelector('.label') || confirmBtn;
                _tryAll(label);
                await _delay(100);
                _tryAll(confirmBtn);
            } else {
                _log('Nie znaleziono "Potwierdzam"');
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
        _tryAll(label || span);
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
