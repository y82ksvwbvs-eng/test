const CalendarMethods = {
    renderCalendar() {
        const d = State.currentCalendarDate, m = d.getMonth(), y = d.getFullYear();
        $('calendar-month-label').innerText = `${CONFIG.MONTHS[m]} ${y}`;
        const calKey = `${y}-${m}`;
        const animate = this._lastCalKey !== calKey;
        this._lastCalKey = calKey;
        const firstDow = new Date(y, m, 1).getDay(), offset = firstDow === 0 ? 6 : firstDow - 1, total = new Date(y, m + 1, 0).getDate();
        const grid = $('calendar-grid'); let html = '';
        let perfect = 0, failed = 0, scoreSum = 0, scoreCount = 0, cellIdx = 0;
        for (let i = 0; i < offset; i++) html += '<div class="aspect-square opacity-0 pointer-events-none"></div>';
        for (let g = 1; g <= total; g++) {
            const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(g).padStart(2,'0')}`;
            const h = State.data.history[ds], sc = h ? h.score : null;
            let cls = `relative aspect-square flex items-center justify-center transition-all cursor-pointer font-bold border-2 rounded-none font-mono text-[10px] sm:text-[12px] ${animate ? 'cal-cell ' : ''}`;
            if (ds === State.activeDate) cls += "border-white bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.5)] ";
            else if (ds === Utils.todayStr()) cls += "border-dashed border-monolith-textDim text-white hover:bg-monolith-panel ";
            else cls += "border-transparent text-monolith-textDim hover:text-white hover:bg-monolith-panel ";
            let dot = '';
            if (sc !== null) {
                cls += sc === 100 ? "border-monolith-toxic bg-monolith-toxicDim text-monolith-toxic " : "border-monolith-blood bg-monolith-bloodDim text-monolith-blood ";
                scoreSum += sc; scoreCount++;
                if (sc === 100) { perfect++; dot = '<span class="cal-dot" style="background:#00ff66;box-shadow:0 0 6px #00ff66"></span>'; }
                else { failed++; dot = '<span class="cal-dot" style="background:#ff003c;box-shadow:0 0 6px #ff003c"></span>'; }
            }
            const delayStyle = animate ? ` style="animation-delay:${Math.min(cellIdx * 12, 260)}ms"` : '';
            cellIdx++;
            html += `<div onclick="UI.onCalendarClick('${ds}')" class="${cls}"${delayStyle} title="${ds}${sc!==null?' // '+sc+'%':''}">${g}${dot}</div>`;
        }
        grid.innerHTML = html;
        const sp = $('cal-stat-perfect'), sf = $('cal-stat-failed'), sa = $('cal-stat-avg');
        if (sp) sp.innerText = perfect;
        if (sf) sf.innerText = failed;
        if (sa) sa.innerText = scoreCount ? Math.round(scoreSum / scoreCount) + '%' : '--%';
    },
    changeMonth(dir) {
        AudioEngine.play('type'); Utils.triggerVibe(10);
        const g = $('calendar-grid'); g.classList.remove('calendar-transition'); void g.offsetWidth; g.classList.add('calendar-transition');
        State.currentCalendarDate.setMonth(State.currentCalendarDate.getMonth() + dir);
        this.renderCalendar();
    },
    onCalendarClick(ds) {
        const h = State.data.history[ds];
        if (h && h.score !== null) return this.openDayDetail(ds);
        AudioEngine.play('type'); State.activeDate = ds; $('date-display').innerText = ds.replace(/-/g, '.');
        this.renderAll();
    },
    openDayDetail(ds) {
        const h = State.data.history[ds]; AudioEngine.play(h.score === 100 ? 'check' : 'glitch');
        $('detail-date').innerText = ds.replace(/-/g, '.');
        const scEl = $('detail-score'); scEl.innerText = `${h.score}%`;
        scEl.className = "font-display font-black text-4xl sm:text-5xl tracking-tighter " + (h.score === 100 ? 'text-monolith-toxic' : 'text-monolith-blood text-aberration');
        const bx = $('detail-tasks');
        if (!h.comp || h.comp.length === 0) bx.innerHTML = `<div class="font-mono text-[10px] text-monolith-blood uppercase font-bold py-6 text-center border-2 border-dashed border-monolith-blood tracking-widest bg-monolith-bloodDim/20">NESSUN DOVERE COMPILATO. TOTALE RESA.</div>`;
        else bx.innerHTML = h.comp.map(t => `<div class="flex items-center gap-4 border-2 border-monolith-border p-3 bg-black"><span class="text-monolith-toxic text-[12px]">■</span><span class="font-mono text-[10px] text-white uppercase font-bold break-words line-clamp-2 tracking-wide">${Utils.escapeHTML(t)}</span></div>`).join('');
        this.fadeInModal('detail-overlay');
    },
    closeDetail() { AudioEngine.play('type'); this.fadeOutModal('detail-overlay'); }
};
