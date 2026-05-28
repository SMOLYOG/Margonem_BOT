(async function() {
    const CLICKER_URL = 'http://localhost:8765/captcha';

    const q = (document.querySelector('.captcha__question')?.textContent || '').toLowerCase();
    let sym = '*';
    if (/gwiazdk/.test(q))                 sym = '*';
    else if (/wykrzyknik/.test(q))         sym = '!';
    else if (/dolar/.test(q))              sym = '$';
    else if (/et\b|małp|ampersand/.test(q)) sym = '&';
    else if (/hash|krzyż|płotek/.test(q))  sym = '#';
    console.log('[DEBUG] Pytanie:', q);
    console.log('[DEBUG] Symbol:', sym);

    const buttons = [...document.querySelectorAll('.captcha__buttons .btn.btn-wood')];
    const targets = buttons.filter(b => {
        const n = b.querySelector('span.gfont')?.getAttribute('name') || '';
        return n.length >= 3 && n.startsWith(sym) && n.endsWith(sym);
    });
    const names = targets.map(b => b.querySelector('span.gfont').getAttribute('name'));
    console.log('[DEBUG] Docelowe:', names);

    function center(el) {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }

    const confirmSpan = [...document.querySelectorAll('.captcha__confirm span.gfont')]
        .find(s => s.getAttribute('name') === 'Potwierdzam');
    const confirmBtn = confirmSpan?.closest('.btn');

    const payload = {
        tiles:   targets.map(center),
        confirm: confirmBtn ? center(confirmBtn) : null,
    };
    console.log('[DEBUG] Payload:', JSON.stringify(payload));

    try {
        const res = await fetch(CLICKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        console.log('[DEBUG] Odpowiedź clicker:', json);
    } catch(e) {
        console.error('[DEBUG] Błąd fetch:', e.message, '— czy captcha_clicker.py działa?');
    }
})();
