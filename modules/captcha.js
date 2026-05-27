MBot.captcha = (() => {
    let _observer = null;
    let _solving = false;

    function _log(msg) { console.log('[MBot CAPTCHA]', msg); }
    function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function _clickEl(el) {
        const r = el.getBoundingClientRect();
        _log(`  rect: ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);

        // Najpierw próbuj jQuery (Margonem używa jQuery do bindowania eventów)
        if (window.jQuery) {
            try { window.jQuery(el).trigger('click'); return; } catch(e) {}
        }

        // Fallback: pełna sekwencja zdarzeń DOM
        if (r.width === 0 || r.height === 0) {
            _log('  UWAGA: zerowe wymiary elementu!');
        }
        const x = r.left + r.width  / 2;
        const y = r.top  + r.height / 2;
        const base = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
        const pb   = { ...base, pointerId: 1, isPrimary: true };
        try { el.dispatchEvent(new PointerEvent('pointerover',  pb)); } catch(e) {}
        el.dispatchEvent(new MouseEvent('mouseover', base));
        try { el.dispatchEvent(new PointerEvent('pointerdown', pb)); } catch(e) {}
        el.dispatchEvent(new MouseEvent('mousedown', base));
        try { el.dispatchEvent(new PointerEvent('pointerup',   pb)); } catch(e) {}
        el.dispatchEvent(new MouseEvent('mouseup',   base));
        el.dispatchEvent(new MouseEvent('click',     base));
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
        _log('Rozwiązuję CAPTCHA...');
        try {
            const container = document.querySelector('.captcha__buttons');
            if (!container) { _log('Brak .captcha__buttons'); _solving = false; return; }

            const buttons = container.querySelectorAll('.btn.btn-wood');
            _log(`${buttons.length} przycisków`);

            for (const btn of buttons) {
                if (_isAsterisk(btn)) {
                    const name = btn.querySelector('span.gfont')?.getAttribute('name');
                    _log('* klik: ' + name);
                    // Klikamy .label — najbardziej prawdopodobny target w jQuery-bindowanym UI
                    const label = btn.querySelector('.label') || btn;
                    _clickEl(label);
                    await _delay(300);
                }
            }

            await _delay(500);

            // Potwierdzam jest w .captcha__confirm
            const confirmBtn = document.querySelector('.captcha__confirm .btn.btn-wood');
            if (confirmBtn) {
                _log('Klikam "Potwierdzam"');
                const label = confirmBtn.querySelector('.label') || confirmBtn;
                _clickEl(label);
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
        _clickEl(label || span);
        for (let i = 0; i < 30; i++) {
            await _delay(250);
            if (document.querySelector('.captcha__buttons')) {
                // Czekamy aż captcha się w pełni załaduje (animacja + event binding)
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
