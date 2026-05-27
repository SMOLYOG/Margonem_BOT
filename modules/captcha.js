MBot.captcha = (() => {
    let _observer = null;
    let _solving = false;

    function _log(msg) { console.log('[MBot CAPTCHA]', msg); }
    function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function _isAsterisk(btn) {
        const span = btn.querySelector('span.gfont');
        if (!span) return false;
        const name = span.getAttribute('name') || '';
        return name.startsWith('*') && name.endsWith('*');
    }

    function _findClickable(span) {
        return span.closest('.btn') || span.closest('button') || span.parentElement;
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
                    btn.click();
                    _log('* klik: ' + btn.querySelector('span.gfont')?.getAttribute('name'));
                    await _delay(150);
                }
            }

            await _delay(300);

            // Kliknij "Potwierdzam"
            const confirmSpan = [...document.querySelectorAll('span.gfont')].find(
                s => s.getAttribute('name') === 'Potwierdzam'
            );
            if (confirmSpan) {
                _findClickable(confirmSpan).click();
                _log('Kliknięto "Potwierdzam"');
            } else {
                _log('Nie znaleziono "Potwierdzam"');
            }
        } catch (err) {
            _log('Błąd: ' + err.message);
        } finally {
            _solving = false;
        }
    }

    async function _handleSolveNow(span) {
        _log('Klikam "Rozwiąż teraz"...');
        _findClickable(span).click();
        // Poczekaj aż pojawi się .captcha__buttons
        for (let i = 0; i < 20; i++) {
            await _delay(200);
            if (document.querySelector('.captcha__buttons')) {
                await _delay(200);
                await _solveCaptcha();
                return;
            }
        }
        _log('Timeout: .captcha__buttons nie pojawiło się');
    }

    function _check() {
        if (_solving) return;

        // Etap 1: pojawia się "Rozwiąż teraz"
        const solveNow = [...document.querySelectorAll('span.gfont')].find(
            s => s.getAttribute('name') === 'Rozwiąż teraz'
        );
        if (solveNow && solveNow.offsetParent !== null) {
            _solving = true; // blokuj ponowne wejście zanim async ruszy
            _handleSolveNow(solveNow).finally(() => { _solving = false; });
            return;
        }

        // Etap 2: .captcha__buttons już widoczne (np. po ręcznym kliknięciu)
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
