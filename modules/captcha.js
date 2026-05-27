MBot.captcha = (() => {
    let _observer = null;
    let _solving = false;

    function _log(msg) { console.log('[MBot CAPTCHA]', msg); }
    function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function _dispatchClick(el) {
        const r = el.getBoundingClientRect();
        const x = r.left + r.width  / 2;
        const y = r.top  + r.height / 2;
        const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new MouseEvent('mouseup',   opts));
        el.dispatchEvent(new MouseEvent('click',     opts));
    }

    function _isAsterisk(btn) {
        const span = btn.querySelector('span.gfont');
        if (!span) return false;
        const name = span.getAttribute('name') || '';
        return name.startsWith('*') && name.endsWith('*');
    }

    function _clickableOf(el) {
        const btn = el.closest('.btn') || el.closest('button') || el.parentElement;
        return (btn && btn.querySelector('.label')) ? btn.querySelector('.label') : btn || el;
    }

    async function _solveCaptcha() {
        if (_solving) return;
        _solving = true;
        _log('Rozwiązuję CAPTCHA...');
        try {
            const container = document.querySelector('.captcha__buttons');
            if (!container) { _log('Brak .captcha__buttons'); return; }

            const buttons = container.querySelectorAll('.btn.btn-wood');
            _log(`${buttons.length} przycisków, klikam gwiazdki...`);

            for (const btn of buttons) {
                if (_isAsterisk(btn)) {
                    const label = btn.querySelector('.label') || btn;
                    _dispatchClick(label);
                    _log('* klik: ' + btn.querySelector('span.gfont')?.getAttribute('name'));
                    await _delay(200);
                }
            }

            await _delay(400);

            const confirmSpan = [...document.querySelectorAll('span.gfont')].find(
                s => s.getAttribute('name') === 'Potwierdzam'
            );
            if (confirmSpan) {
                _dispatchClick(_clickableOf(confirmSpan));
                _log('Kliknięto "Potwierdzam"');
            } else {
                _log('Nie znaleziono "Potwierdzam"');
            }
        } catch (err) {
            _log('Błąd: ' + err.message);
        }
        // Blokuj przez 5s — CAPTCHA powinna się zamknąć w tym czasie
        await _delay(5000);
        _solving = false;
    }

    async function _handleSolveNow(span) {
        _solving = true;
        _log('Klikam "Rozwiąż teraz"...');
        _dispatchClick(_clickableOf(span));
        for (let i = 0; i < 20; i++) {
            await _delay(250);
            if (document.querySelector('.captcha__buttons')) {
                await _delay(300);
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
