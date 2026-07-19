function runBoot() {
    const s = $('boot-screen'), t = $('boot-text'); s.classList.remove('hidden'); s.style.display = 'flex';
    const lines = ["INIZIALIZZAZIONE KERNEL O.S.I.R.I.S. v3.0...", "CARICAMENTO MODULI DI CONTROLLO PSICOLOGICO [OK]", "MODULO AUDIO ELIMINATO: REQUISITO UTENTE SODDISFATTO", "VERIFICA INTEGRITÀ DEL SOGGETTO... [FALLITA: RILEVATA DEBOLEZZA]", "AVVIO INTERFACCIA OPERATIVA. PREPARARSI AL GIUDIZIO."];
    let i = 0;
    const typeLine = () => {
        if (i < lines.length) { t.innerHTML += lines[i++] + "<br>"; AudioEngine.play('process'); setTimeout(typeLine, 200 + Math.random() * 300); } 
        else setTimeout(() => { s.style.opacity = '0'; $('main-content').classList.remove('opacity-0'); sessionStorage.setItem('osiris_booted', 'true'); setTimeout(() => { s.style.display = 'none'; State.load(); }, 400); }, 800);
    }; setTimeout(typeLine, 500);
}

window.onload = () => {
    (function syncDateTimeNow(){
        const d = new Date();
        const dd = String(d.getDate()).padStart(2,'0');
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const yyyy = d.getFullYear();
        const dEl = $('date-display'); if (dEl) dEl.innerText = `${dd}.${mm}.${yyyy}`;
        const cEl = $('clock-display');
        const tick = () => {
            const n = new Date();
            const hh = String(n.getHours()).padStart(2,'0');
            const mi = String(n.getMinutes()).padStart(2,'0');
            const ss = String(n.getSeconds()).padStart(2,'0');
            if (cEl) cEl.innerText = `${hh}:${mi}:${ss}`;
            const cur = `${String(n.getDate()).padStart(2,'0')}.${String(n.getMonth()+1).padStart(2,'0')}.${n.getFullYear()}`;
            if (dEl && dEl.innerText !== cur) dEl.innerText = cur;
        }; tick(); setInterval(tick, 1000);
        
        State.currentCalendarDate = new Date();
        const lbl = $('calendar-month-label');
        if (lbl) lbl.innerText = `${CONFIG.MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    })();

    $('action-form').addEventListener('submit', (e) => { e.preventDefault(); Logic.addTask($('action-input').value.trim().toUpperCase()); });
    setInterval(() => State.checkDayChange(), 30000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') State.checkDayChange(); });
    window.addEventListener('focus', () => State.checkDayChange());

    ShareURL.checkOnBoot();

    if (sessionStorage.getItem('osiris_booted')) {
        $('intro-overlay').classList.add('hidden'); $('main-content').classList.remove('opacity-0'); State.load();
    } else {
        $('intro-overlay').classList.remove('hidden'); $('intro-overlay').style.display = 'flex';
        $('enter-app-btn').addEventListener('click', () => {
            AudioEngine.play('type'); Utils.triggerVibe(15); $('intro-overlay').style.opacity = '0';
            setTimeout(() => { $('intro-overlay').style.display = 'none'; runBoot(); }, 500);
        });
    }
};
