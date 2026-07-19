const StatisticsMethods = {
    openStatsModal() {
        AudioEngine.play('check');
        const d = State.data, hVals = Object.values(d.history).filter(x => x.score !== null);
        $('st-days').innerText = hVals.length;
        $('st-perfect').innerText = hVals.filter(x => x.score === 100).length;
        $('st-failed').innerText = hVals.filter(x => x.score < 100).length;
        $('st-avg').innerText = hVals.length ? Math.round(hVals.reduce((a,b)=>a+b.score,0)/hVals.length) + '%' : '0%';
        $('st-t-done').innerText = d.totalTasksCompleted;
        $('st-t-miss').innerText = d.totalTasksMissed;
        $('st-best-streak').innerText = d.bestStreak;
        $('st-prestige').innerText = d.prestige;
        this.fadeInModal('stats-modal');
    },
    openTrophiesModal() { TrophyUI.open(); },
    closeTrophiesModal() { TrophyUI.close(); },
    openConfessionsModal() {
        AudioEngine.play('glitch'); Utils.triggerVibe([20, 20]);
        const list = $('confessions-list'), cnt = $('confessions-count');
        const arr = Array.isArray(State.data.confessions) ? State.data.confessions : [];
        cnt.innerText = arr.length;
        if (arr.length === 0) {
            list.innerHTML = `<div class="font-mono text-[10px] sm:text-xs text-monolith-toxic uppercase font-bold py-10 text-center border-2 border-dashed border-monolith-toxic tracking-widest bg-monolith-toxicDim/10">NESSUNA SCUSA REGISTRATA. RARO SEGNO DI DIGNITÀ.</div>`;
        } else {
            list.innerHTML = arr.map(c => {
                const d = new Date(c.ts || Date.now());
                const when = `${(c.date || Utils.dateToStr(d)).replace(/-/g,'.')} // ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                return `<div class="border-2 border-monolith-blood bg-monolith-bloodDim/10 p-3 sm:p-4">
                    <div class="flex justify-between items-start gap-3 border-b border-monolith-blood/40 pb-2 mb-2">
                        <span class="font-mono text-[9px] sm:text-[10px] text-monolith-blood font-black uppercase tracking-widest break-words">DOVERE: ${Utils.escapeHTML(c.task || '—')}</span>
                        <span class="font-mono text-[8px] sm:text-[9px] text-monolith-textDim font-bold tracking-widest whitespace-nowrap shrink-0">${when}</span>
                    </div>
                    <p class="font-mono text-[10px] sm:text-[11px] text-white leading-relaxed tracking-wide break-words">"${Utils.escapeHTML(c.text || '')}"</p>
                </div>`;
            }).join('');
        }
        this.fadeInModal('confessions-modal');
    },
    closeConfessionsModal() { AudioEngine.play('type'); this.fadeOutModal('confessions-modal'); },
    closeStatsModal() { AudioEngine.play('type'); this.fadeOutModal('stats-modal'); }
};
