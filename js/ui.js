const Corruption = {
    level: 0, target: 0, t: 0, running: false,
    set(target) {
        this.target = Math.max(0, Math.min(1, target));
        if (!this.running) { this.running = true; this.loop(); }
    },
    loop() {
        const overlay = $('corruption-overlay'), band = $('glitch-band');
        this.t += 0.016; this.level += (this.target - this.level) * 0.06;
        if (this.level > 0.004) {
            overlay.style.setProperty('--corr-op', this.level.toFixed(2)); overlay.classList.add('on');
            overlay.style.opacity = Math.min(0.9, this.level * 1.2);
            if (this.level > 0.35) band.classList.add('on'); else band.classList.remove('on');
            document.documentElement.style.setProperty('--chroma', `${(this.level * 8).toFixed(1)}px`);
            requestAnimationFrame(() => this.loop());
        } else {
            overlay.classList.remove('on'); overlay.style.opacity = 0; band.classList.remove('on');
            document.documentElement.style.setProperty('--chroma', '0px');
            document.querySelectorAll('.chroma-active').forEach(e => e.classList.remove('chroma-active'));
            this.level = 0; this.running = false;
        }
    }
};

const Purgatory = {
    evaluate() {
        const keys = Object.keys(State.data.history).filter(k => State.data.history[k].score !== null).sort().reverse();
        let consecutiveFail = 0;
        for (const k of keys) { if (State.data.history[k].score < 100) consecutiveFail++; else break; }
        const active = consecutiveFail >= CONFIG.PURGATORY_THRESHOLD;
        document.body.classList.toggle('purgatorio-active', active);
        
        if (active && Corruption.target < 0.25) Corruption.set(0.28);
        else if (!active) {
            const h = State.data.history[State.activeDate];
            if (!h || h.score === null || h.score === 100) Corruption.set(0);
        }
    }
};

const Streak = {
    lastTier: -1, lastVal: -1,
    tierOf(n) {
        if (n >= 1000) return 8; if (n >= 365) return 7; if (n >= 100) return 6;
        if (n >= 50) return 5;  if (n >= 30) return 4;  if (n >= 15) return 3;
        if (n >= 7) return 2;   if (n >= 3) return 1;   return 0;
    },
    badge(tier) {
        switch (tier) {
            case 4: return ['▲ 30', 'streak-badge-gold'];
            case 5: return ['◆ 50', 'streak-badge-purple'];
            case 6: return ['♛ 100', 'streak-badge-legend'];
            case 7: return ['☀ 365', 'streak-badge-legend'];
            case 8: return ['∞ 1000', 'streak-badge-legend'];
            default: return null;
        }
    },
    apply() {
        const n = State.data.streak || 0;
        const tier = this.tierOf(n);
        const el = $('streak-counter');
        if (el) {
            el.className = `text-sm sm:text-base font-black streak-t${tier}`;
            if (tier > this.lastTier && this.lastTier !== -1) {
                el.classList.add('streak-flash');
                setTimeout(() => el.classList.remove('streak-flash'), 800);
                Utils.triggerVibe([30, 30, 60]);
            }
        }
        const b = $('streak-badge');
        if (b) {
            const info = this.badge(tier);
            if (info) { b.className = `${info[1]}`; b.innerText = info[0]; b.classList.remove('hidden'); }
            else { b.classList.add('hidden'); b.innerText = ''; }
        }
        document.body.classList.toggle('streak-legend', tier >= 7);
        document.body.classList.toggle('streak-myth', tier >= 8);
        this.lastTier = tier; this.lastVal = n;
    }
};

const Logic = {
    addTask(val) {
        if (!val) return;
        if (State.data.tasks.includes(val)) { AudioEngine.play('error'); Utils.triggerVibe(30); UI.popToast("PARAMETRO ETICO GIÀ ESISTENTE", true); return; }
        AudioEngine.play('type'); Utils.triggerVibe(10);
        State.data.tasks.unshift(val);
        $('action-input').value = '';
        State.save();
    },
    removeTask(idx, e) {
        e.stopPropagation(); AudioEngine.play('type'); Utils.triggerVibe(20);
        State.data.tasks.splice(idx, 1);
        UI.popToast("Elemento rimosso. Troppo difficile?", true);
        State.save();
    },
    toggleTask(task) {
        if (Reorder.active) return;
        if (State.activeDate !== Utils.todayStr()) { AudioEngine.play('error'); UI.popToast("STORICO IN SOLA LETTURA", true); return; }
        const h = State.data.history[State.activeDate];
        if (h.score !== null) return;
        
        if (h.comp.includes(task)) {
            State.pendingUncheckTask = task; AudioEngine.play('error'); Utils.triggerVibe([20, 20]);
            $('confessional-input').value = ''; UI.updateConfessionalCount();
            UI.fadeInModal('confessional-overlay');
        } else {
            AudioEngine.play('check'); Utils.triggerVibe(15);
            h.comp.push(task);
            BossHP.registerDamage(10);
            State.save();
        }
    },
    submitConfessional() {
        if (!State.pendingUncheckTask) return;
        AudioEngine.play('glitch'); Utils.triggerVibe([50, 50]);
        let h = State.data.history[State.activeDate];
        h.comp = h.comp.filter(t => t !== State.pendingUncheckTask);
        BossHP.registerHeal(5);
        const excuse = ($('confessional-input').value || '').trim();
        if (!Array.isArray(State.data.confessions)) State.data.confessions = [];
        State.data.confessions.unshift({
            date: State.activeDate,
            task: State.pendingUncheckTask,
            text: excuse,
            ts: Date.now()
        });
        State.pendingUncheckTask = null;
        UI.fadeOutModal('confessional-overlay');
        State.save(); UI.popToast("Rinuncia e scuse registrate. Vergognati.", true);
    },
    triggerJudgment() {
        if (State.activeDate !== Utils.todayStr()) return UI.popToast("CICLO ACCESSIBILE SOLO NELL'ODIERNO", true);
        if (State.data.tasks.length === 0) return UI.popToast("ERRORE: VETTORE ANALISI VUOTO", true);
        const h = State.data.history[State.activeDate];
        if (h.score !== null) return UI.popToast("VERDETTO GIÀ REGISTRATO.", true);
        if (State.data.targetTasks && State.data.tasks.length < State.data.targetTasks) {
            AudioEngine.play('error'); Utils.triggerVibe([100, 50, 100]);
            return UI.popToast(`SOVRACCARICO: REQ. ${State.data.targetTasks} DOVERI. NON ADAGIARTI.`, true);
        }

        const total = State.data.tasks.length, comp = State.data.tasks.filter(t => h.comp.includes(t)).length;
        const pct = Math.round((comp / total) * 100);
        
        UI.startProcessingOverlay(() => {
            State.data.history[State.activeDate].score = pct;
            State.data.lastJudged = State.activeDate;
            State.data.totalTasksCompleted += comp;
            State.data.totalTasksMissed += (total - comp);
            BossHP.registerHeal((total - comp) * 12);
            if (pct === 100) BossHP.registerDamage(25);
            
            const wasInPurgatory = document.body.classList.contains('purgatorio-active');

            if (pct === 100) {
                State.data.streak++;
                if (State.data.streak > State.data.bestStreak) State.data.bestStreak = State.data.streak;
                if (State.data.streak > 0 && State.data.streak % 10 === 0) State.data.targetTasks = Math.max(State.data.targetTasks, State.data.tasks.length + 1);
                if (wasInPurgatory && !State.data.achievements.includes('purgatory_escape')) {
                    State.data.achievements.push('purgatory_escape');
                    setTimeout(() => UI.popAchievement('purgatory_escape'), 2000);
                }
            } else { State.data.streak = 0; }

            const xpBefore = State.data.xp;
            const lvlBefore = Gamification.fromXP(xpBefore);
            const xpGain = Gamification.computeSessionXP(pct, State.data.streak);
            State.data.xp += xpGain;
            const lvlAfter = Gamification.fromXP(State.data.xp);
            
            State.save();
            Gamification.checkAchievements();
            Reveal.startDaily(pct, comp, total, xpBefore, xpGain, lvlBefore, lvlAfter);
        });
    },
    triggerBossJudgment() {
        const pct = Utils.avgOverDays(7, State.data.history) || 0;
        UI.startProcessingOverlay(() => {
            const bossState = BossHP.compute();
            const combined = Math.round(pct * 0.5 + bossState.dmgPct * 0.5);
            const tier = Gamification.bossTier(combined);
            const wk = Utils.getISOWeek(new Date());
            State.data.bossHistory[wk] = { avg: pct, dmgPct: bossState.dmgPct, combined, outcome: tier.outcome, xpGain: tier.xp };
            State.data.lastBossWeek = wk;
            
            if (tier.outcome === 'mythic' && !State.data.achievements.includes('boss_mythic')) {
                State.data.achievements.push('boss_mythic');
                setTimeout(() => UI.popAchievement('boss_mythic'), 2000);
            }

            const xpBefore = State.data.xp;
            const lvlBefore = Gamification.fromXP(xpBefore);
            State.data.xp += tier.xp;
            const lvlAfter = Gamification.fromXP(State.data.xp);
            BossHP.resetWeek();
            
            State.save();
            Gamification.checkAchievements();
            Reveal.startBoss(pct, tier, xpBefore, lvlBefore, lvlAfter);
        });
    },
    ascendPrestige() {
        AudioEngine.play('levelup'); Utils.triggerVibe([100, 100, 300]);
        State.data.prestige++;
        State.data.xp = 0;
        State.save();
        UI.closeVerdict();
        setTimeout(() => UI.popToast("ASCENSIONE COMPLETATA. IL CICLO RICOMINCIA."), 500);
        Gamification.checkAchievements();
    },
    confirmPurge() {
        AudioEngine.play('error'); Utils.triggerVibe([100, 100, 100]);
        State.data.tasks = []; State.data.history = {}; State.data.streak = 0; State.data.targetTasks = 1;
        State.data.confessions = [];
        State.save(); UI.closePurgeModal();
        UI.popToast("MEMORIA AZZERATA. TIPICO DI TE.", true);
    }
};

const Suggestions = {
    COUNT: 3,
    rerollOffset: 0,
    dayIndex() {
        const d = new Date();
        const local = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
        return Math.floor(local / 86400000);
    },
    daily() {
        const pool = TASK_SUGGESTIONS, n = pool.length;
        const base = (this.dayIndex() * this.COUNT + this.rerollOffset * this.COUNT);
        const out = [];
        for (let k = 0; k < this.COUNT && k < n; k++) out.push(pool[((base + k) % n + n) % n]);
        return out;
    },
    render() {
        const box = $('suggestions-list'); if (!box) return;
        const today = Utils.todayStr();
        const h = State.data.history[today] || { comp: [] };
        const isJudged = h.score !== null;
        const wrap = $('suggestions-wrap');
        if (wrap) wrap.style.display = isJudged ? 'none' : '';
        if (isJudged) { box.innerHTML = ''; return; }
        box.innerHTML = this.daily().map(t => {
            const already = State.data.tasks.includes(t);
            return `<button type="button" class="suggest-chip ${already ? 'added' : ''}" ${already ? 'disabled' : ''} onclick="Suggestions.add('${t.replace(/'/g, "\\'")}')" data-testid="suggest-chip">
                <span class="plus">${already ? '✓' : '+'}</span><span>${Utils.escapeHTML(t)}</span>
            </button>`;
        }).join('');
    },
    add(t) {
        if (State.data.tasks.includes(t)) return;
        Logic.addTask(t);
    },
    reroll() {
        this.rerollOffset++;
        AudioEngine.play('type'); Utils.triggerVibe(10);
        this.render();
    }
};

const Reorder = {
    active: false,
    srcIdx: -1,
    handle(i, e) {
        if (e) { e.stopPropagation(); e.preventDefault && e.preventDefault(); }
        const h = State.data.history[State.activeDate];
        if (h && h.score !== null) return;
        if (this.active) {
            if (i === this.srcIdx) { this.cancel(); return; }
            this.place(i); return;
        }
        this.start(i);
    },
    start(i) {
        this.active = true; this.srcIdx = i;
        AudioEngine.play('type'); Utils.triggerVibe(15);
        UI.renderTasks(State.data.history[State.activeDate] || { comp: [], score: null });
    },
    place(tgt) {
        if (!this.active) return;
        const from = this.srcIdx;
        this.active = false; this.srcIdx = -1;
        if (tgt !== from && from > -1 && tgt > -1) {
            const item = State.data.tasks.splice(from, 1)[0];
            State.data.tasks.splice(tgt, 0, item);
            AudioEngine.play('check'); Utils.triggerVibe(20);
            State.save();
        } else {
            AudioEngine.play('type');
            UI.renderTasks(State.data.history[State.activeDate] || { comp: [], score: null });
        }
    },
    cancel() {
        this.active = false; this.srcIdx = -1;
        AudioEngine.play('type'); Utils.triggerVibe(10);
        UI.renderTasks(State.data.history[State.activeDate] || { comp: [], score: null });
    }
};

const Reveal = {
    setupOverlay(isFail, colorHex, btnText) {
        const vo = $('verdict-overlay'), vw = $('verdict-window'), vc = $('verdict-score-container');
        const vBtn = $('verdict-close-btn'), vText = $('verdict-text'), vArea = $('verdict-action-area');
        
        vc.className = "mono-panel p-4 sm:p-10 w-full text-center border-4 mb-4 sm:mb-6 flex flex-col justify-center items-center bg-black relative overflow-hidden";
        vBtn.className = "btn-monolith w-full sm:w-auto px-6 sm:px-12 py-3.5 sm:py-5 text-[10px] sm:text-xs font-mono tracking-widest font-black flex-1";
        vArea.classList.add('opacity-0'); $('verdict-stats-panel').classList.remove('show');
        $('verdict-level-panel').classList.remove('show'); $('verdict-week-panel').classList.remove('show');
        vText.innerHTML = ''; $('verdict-score').innerText = '0%';
        ['stat-cell-done','stat-cell-missed','stat-cell-streak','stat-cell-avg7'].forEach(id => $(id).classList.remove('reveal'));
        
        if (!isFail) {
            $('verdict-score').className = `font-display font-black verdict-huge transition-colors duration-1000 relative z-10 text-[${colorHex}]`;
            $('verdict-score').style.color = colorHex;
            vc.style.borderColor = colorHex; $('verdict-text-box').style.borderColor = colorHex;
            vBtn.style.backgroundColor = colorHex; vBtn.style.borderColor = colorHex; vBtn.style.color = '#000';
            vBtn.innerText = btnText; Corruption.set(0);
        } else {
            $('verdict-score').className = "font-display font-black verdict-huge transition-colors duration-1000 relative z-10 text-monolith-blood text-aberration chroma-active";
            $('verdict-score').style.color = '';
            vc.style.borderColor = '#ff003c'; $('verdict-text-box').style.borderColor = '#ff003c';
            vBtn.style.backgroundColor = '#ff003c'; vBtn.style.borderColor = '#ff003c'; vBtn.style.color = '#fff';
            vBtn.innerText = btnText;
            document.body.classList.add('shake-active'); setTimeout(() => document.body.classList.remove('shake-active'), 650);
        }
        vo.style.display = 'block'; vo.classList.remove('hidden'); vo.scrollTop = 0;
        return { vo, vw, vText, vArea };
    },
    animateCountUp(el, from, to, dur, fmt, cb) {
        const start = performance.now();
        const frame = (t) => {
            const p = Math.min(1, (t - start) / dur), eased = 1 - Math.pow(1 - p, 3);
            el.innerText = fmt(Math.round(from + (to - from) * eased));
            if (p < 1) requestAnimationFrame(frame); else if (cb) cb();
        }; requestAnimationFrame(frame);
    },
    typeWriter(el, text, i, cb) {
        if (i === 0) el.innerHTML = '';
        if (i < text.length) { el.innerHTML += text.charAt(i); if(i%2===0) AudioEngine.play('type'); setTimeout(() => this.typeWriter(el, text, i+1, cb), 25); }
        else { el.innerHTML += '<span class="animate-pulse">_</span>'; if (cb) cb(); }
    },
    renderLevelCard(xpBef, xpGain, lvlBef, lvlAft) {
        const leveledUp = lvlAft.level > lvlBef.level;
        $('level-num').innerText = String(lvlBef.level).padStart(2, '0');
        $('level-name').innerText = Gamification.nameOf(lvlBef.level);
        const gb = Gamification.gradeOf(lvlBef.level);
        $('level-grade').innerText = gb.grade; $('level-tier-label').innerText = `${gb.grade} // ${gb.tier}`;
        $('level-xp-bar').style.transition = 'none';
        $('level-xp-bar').style.width = lvlBef.xpForNext > 0 ? `${(lvlBef.xpInLevel/lvlBef.xpForNext)*100}%` : '100%';
        $('level-xp-current').innerText = lvlBef.xpInLevel; $('level-xp-next').innerText = lvlBef.xpForNext > 0 ? lvlBef.xpForNext : 'MAX';
        const gc = xpGain >= 50 ? 'text-monolith-toxic' : (xpGain > 0 ? 'text-white' : 'text-monolith-blood');
        $('level-xp-gain').className = `mt-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest font-bold ${gc}`;
        $('level-xp-gain').innerText = `+${xpGain} XP`;

        setTimeout(() => {
            $('level-xp-bar').style.transition = 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)';
            if (leveledUp) {
                $('level-xp-bar').style.width = '100%';
                setTimeout(() => {
                    const fl = $('levelup-flash'); fl.querySelector('.card').innerHTML = `LEVEL UP<br><span style="font-size:0.4em;letter-spacing:0.3em;color:#71717a">${Gamification.gradeOf(lvlAft.level).grade} // ${Gamification.nameOf(lvlAft.level)}</span>`;
                    fl.classList.add('on'); AudioEngine.play('levelup'); Utils.triggerVibe([50, 30, 50, 30, 150]);
                    setTimeout(() => fl.classList.remove('on'), 1200);
                }, 800);
                setTimeout(() => {
                    $('level-num').innerText = String(lvlAft.level).padStart(2, '0'); $('level-num').classList.add('level-up-flash');
                    $('level-name').innerText = Gamification.nameOf(lvlAft.level);
                    const ga = Gamification.gradeOf(lvlAft.level); $('level-grade').innerText = ga.grade; $('level-tier-label').innerText = `${ga.grade} // ${ga.tier}`;
                    $('level-xp-bar').style.transition = 'none'; $('level-xp-bar').style.width = '0%';
                    $('level-xp-current').innerText = '0'; $('level-xp-next').innerText = lvlAft.xpForNext > 0 ? lvlAft.xpForNext : 'MAX';
                    setTimeout(() => {
                        $('level-xp-bar').style.transition = 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)';
                        $('level-xp-bar').style.width = lvlAft.xpForNext > 0 ? `${(lvlAft.xpInLevel/lvlAft.xpForNext)*100}%` : '100%';
                        this.animateCountUp($('level-xp-current'), 0, lvlAft.xpInLevel, 900, v=>`${v}`);
                    }, 60);
                    setTimeout(() => $('level-num').classList.remove('level-up-flash'), 1000);
                }, 1600);
            } else {
                $('level-xp-bar').style.width = lvlAft.xpForNext > 0 ? `${(lvlAft.xpInLevel/lvlAft.xpForNext)*100}%` : '100%';
                this.animateCountUp($('level-xp-current'), lvlBef.xpInLevel, lvlAft.xpInLevel, 900, v=>`${v}`);
                AudioEngine.play('process');
            }
            $('prestige-action-wrap').classList.toggle('hidden', lvlAft.level < 100);
        }, 200);
    },
    renderWeekBars() {
        const wrap = $('week-bars'), days = Utils.last7DaysScores(State.data.history);
        wrap.innerHTML = days.map(d => {
            let cls = 'week-bar'; if (d.score === null) cls += ' empty'; else if (d.score === 100) cls += ' pos'; else cls += ' neg';
            if (d.isToday) cls += ' today';
            return `<div class="${cls}" data-h="${d.score === null ? 10 : Math.max(8, d.score)}"><div class="fill" style="height:0%"></div><div class="lbl">${d.dow}</div></div>`;
        }).join('');
        wrap.querySelectorAll('.week-bar').forEach((b, i) => setTimeout(() => { b.querySelector('.fill').style.height = `${b.getAttribute('data-h')}%`; AudioEngine.play('process'); }, i * 90));
    },
    startDaily(pct, comp, total, xpBef, xpGain, lvlBef, lvlAft) {
        const isFail = pct < 100;
        const color = isFail ? '#ff003c' : '#00ff66', btnText = isFail ? "INCASSA L'UMILIAZIONE" : "ACCETTA LA TREGUA";
        $('verdict-tag').innerText = 'RAPPORTO DI CONDOTTA PERSONALE';
        $('verdict-score-sub').innerText = `${comp}/${total} DOVERI`;
        
        $('lbl-cell-done').innerText = 'Adempiuti'; $('lbl-cell-missed').innerText = 'Disertati';
        $('lbl-cell-streak').innerText = 'Catena'; $('lbl-cell-avg7').innerText = 'Media 7GG';

        const { vo, vw, vText, vArea } = this.setupOverlay(isFail, color, btnText);
        if (isFail) Corruption.set(0.5 + (1 - pct / 100) * 0.7);

        setTimeout(() => {
            vo.classList.remove('opacity-0'); vw.classList.remove('translate-y-8');
            AudioEngine.play(isFail ? 'error' : 'success'); Utils.triggerVibe(isFail ? [100,50,100,50,300] : [40,40,250]);
            
            this.animateCountUp($('verdict-score'), 0, pct, 700, v=>`${v}%`, () => AudioEngine.play(isFail ? 'glitch':'check'));
            
            setTimeout(() => {
                $('verdict-stats-panel').classList.add('show');
                const missed = total - comp, aw = Utils.avgOverDays(7, State.data.history);
                $('stat-cell-done').classList.toggle('pos', comp>0); $('stat-cell-missed').classList.toggle('neg', missed>0); $('stat-cell-streak').classList.toggle('pos', State.data.streak>0);
                const cells = [ { id: 'stat-cell-done', el:$('stat-done'), val: comp, fmt: v=>v }, { id: 'stat-cell-missed', el:$('stat-missed'), val: missed, fmt: v=>v },
                                { id: 'stat-cell-streak', el:$('stat-streak'), val: State.data.streak, fmt: v=>v }, { id: 'stat-cell-avg7', el:$('stat-avg7'), val: aw, fmt: v=>v===null?'--%':`${v}%` }];
                cells.forEach((c,i) => setTimeout(() => { $(c.id).classList.add('reveal'); AudioEngine.play('process'); if(c.val!==null) this.animateCountUp(c.el, 0, c.val, 500, c.fmt); else c.el.innerText='--%'; }, i*150));
            }, 900);
            
            setTimeout(() => { $('verdict-level-panel').classList.add('show'); this.renderLevelCard(xpBef, xpGain, lvlBef, lvlAft); }, 1900);
            setTimeout(() => { $('verdict-week-panel').classList.add('show'); this.renderWeekBars(); }, 3000);
            
            setTimeout(() => { 
                const phrase = Narrator.getDailyPhrase(pct, lvlAft.level); 
                this.typeWriter(vText, phrase, 0, () => vArea.classList.remove('opacity-0')); 
            }, 3900);
        }, 150);
    },
    startBoss(pct, tier, xpBef, lvlBef, lvlAft) {
        const isFail = tier.outcome === 'defeat';
        const color = ['mythic','gold'].includes(tier.outcome) ? '#fbbf24' : (tier.outcome === 'silver' ? '#a1a1aa' : (isFail ? '#ff003c' : '#ffffff'));
        const btnText = isFail ? "INCASSA IL FIASCO" : "ACCETTA IL TROFEO";
        $('verdict-tag').innerText = `GIUDIZIO SETTIMANALE // BOSS BATTLE // ${tier.tag}`;
        $('verdict-score-sub').innerText = `MEDIA 7 GIORNI // BONUS: +${tier.xp} XP`;
        
        $('lbl-cell-done').innerText = '100% GG'; $('lbl-cell-missed').innerText = 'FALLIMENTI';
        $('lbl-cell-streak').innerText = 'GG PERSI'; $('lbl-cell-avg7').innerText = 'MEDIA 7GG';

        const { vo, vw, vText, vArea } = this.setupOverlay(isFail, color, btnText);
        if (isFail) Corruption.set(0.7); else if (tier.outcome==='silver'||tier.outcome==='bronze') Corruption.set(0.18);

        setTimeout(() => {
            vo.classList.remove('opacity-0'); vw.classList.remove('translate-y-8');
            AudioEngine.play(isFail ? 'error' : 'success'); Utils.triggerVibe(isFail ? [100,50,100,50,300] : [40,40,250]);
            this.animateCountUp($('verdict-score'), 0, pct, 800, v=>`${v}%`, () => AudioEngine.play(isFail ? 'glitch':'check'));
            
            setTimeout(() => {
                $('verdict-stats-panel').classList.add('show');
                const days = Utils.last7DaysScores(State.data.history);
                const wins = days.filter(d=>d.score===100).length, lost = days.filter(d=>d.score!==null && d.score<100).length, skip = days.filter(d=>d.score===null).length;
                $('stat-cell-done').classList.toggle('pos', wins>0); $('stat-cell-missed').classList.toggle('neg', lost>0); $('stat-cell-streak').classList.toggle('pos', State.data.streak>0);
                const cells = [ { id: 'stat-cell-done', el:$('stat-done'), val: wins, fmt: v=>v }, { id: 'stat-cell-missed', el:$('stat-missed'), val: lost, fmt: v=>v },
                                { id: 'stat-cell-streak', el:$('stat-streak'), val: skip, fmt: v=>v }, { id: 'stat-cell-avg7', el:$('stat-avg7'), val: pct, fmt: v=>`${v}%` }];
                cells.forEach((c,i) => setTimeout(() => { $(c.id).classList.add('reveal'); AudioEngine.play('process'); this.animateCountUp(c.el, 0, c.val, 500, c.fmt); }, i*150));
            }, 900);
            
            setTimeout(() => { $('verdict-level-panel').classList.add('show'); this.renderLevelCard(xpBef, tier.xp, lvlBef, lvlAft); }, 1900);
            setTimeout(() => { $('verdict-week-panel').classList.add('show'); this.renderWeekBars(); }, 3000);
            
            setTimeout(() => { 
                const phrase = Narrator.getBossPhrase(tier, pct, lvlAft.level);
                this.typeWriter(vText, phrase, 0, () => vArea.classList.remove('opacity-0')); 
            }, 3900);
        }, 150);
    }
};

const UI = {
    ...CalendarMethods,
    ...StatisticsMethods,
    renderAll() {
        const d = State.data, hData = d.history[State.activeDate] || { comp: [], score: null };
        const total = d.tasks.length, comp = d.tasks.filter(t => hData.comp.includes(t)).length;
        const pct = total === 0 ? 0 : Math.round((comp / total) * 100);

        $('streak-counter').innerText = d.streak; $('best-streak').innerText = d.bestStreak;
        Streak.apply();
        $('progress-text').innerText = `${pct}% [${comp}/${total}]`; $('progress-bar-fill').style.width = `${pct}%`;
        
        if (d.prestige > 0) { $('prestige-badge').innerText = `P${d.prestige}`; $('prestige-badge').classList.remove('hidden'); }
        
        const trgLabel = $('target-task-display'), trgCount = $('target-task-count');
        if (d.targetTasks && d.tasks.length < d.targetTasks) { trgLabel.classList.remove('hidden'); trgCount.innerText = d.targetTasks; } 
        else trgLabel.classList.add('hidden');

        const aw = Utils.avgOverDays(7, d.history), am = Utils.avgOverDays(30, d.history);
        $('avg-week').innerText = aw === null ? '--%' : `${aw}%`; $('avg-month').innerText = am === null ? '--%' : `${am}%`;

        const appBody = $('app-body'), statusPixel = $('status-pixel');
        appBody.classList.remove('state-neutral', 'state-error', 'state-success');
        statusPixel.className = "w-2.5 h-2.5 rounded-none animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)] flex-shrink-0 ";
        
        if (hData.score !== null) {
            if (hData.score === 100) { appBody.classList.add('state-success'); statusPixel.classList.add('bg-monolith-toxic', 'shadow-monolith-toxic'); }
            else { appBody.classList.add('state-error'); statusPixel.classList.add('bg-monolith-blood', 'shadow-monolith-blood'); }
        } else { appBody.classList.add('state-neutral'); statusPixel.classList.add('bg-white'); }

        this.renderTasks(hData);
        this.renderCalendar();
        Suggestions.render();
        Purgatory.evaluate();
        BossHP.render();
        
        const canFightBoss = Utils.isSunday() && State.data.lastBossWeek !== Utils.getISOWeek(new Date());
        $('boss-battle-wrap').classList.toggle('on', canFightBoss);
        $('daily-judgment-wrap').classList.toggle('off', canFightBoss);
        
        if(canFightBoss) {
            const bPct = Utils.avgOverDays(7, d.history) || 0;
            const bTier = Gamification.bossTier(bPct);
            $('btn-boss-main').className = `btn-boss ${bTier.css}`;
        }
    },
    renderTasks(hData) {
        const list = $('task-list'), isJudged = hData.score !== null;
        if (State.data.tasks.length === 0) {
            list.innerHTML = `<div class="font-mono text-[10px] sm:text-xs text-monolith-textDim italic py-10 text-center border-2 border-dashed border-monolith-border uppercase tracking-widest">MEMORIA SOGGETTO VUOTA. INSERIRE DIRETTIVA.</div>`;
            return;
        }
        const reorder = Reorder.active;
        list.innerHTML = State.data.tasks.map((task, i) => {
            const isDone = hData.comp.includes(task);
            let podClass = `task-pod flex items-center justify-between p-3 sm:p-4 border-2 transition-all duration-200 ${isDone ? 'completed opacity-50 border-monolith-textDim bg-[#0a0a0c]' : 'bg-[#050505] border-monolith-border hover:border-white'}`;
            let textClass = `font-mono text-[11px] sm:text-xs font-bold uppercase transition-colors tracking-wide ${isDone ? 'text-monolith-textDim line-through' : 'text-white'}`;
            if (isJudged) {
                podClass += " pointer-events-none ";
                podClass += hData.score === 100 ? " border-monolith-toxic bg-monolith-toxicDim/10" : " border-monolith-blood bg-monolith-bloodDim/10";
            }
            if (reorder) {
                if (i === Reorder.srcIdx) podClass += " reorder-src ";
                else podClass += " reorder-target ";
            }
            const handleActive = (reorder && i === Reorder.srcIdx);
            return `<div class="${podClass} select-none" data-index="${i}" onclick="UI.onTaskClick(${i}, event)">
                <div class="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    ${!isJudged ? `<span class="drag-handle text-[12px] sm:text-[14px] flex-shrink-0 ${handleActive ? 'reorder-handle-on' : ''}" onclick="Reorder.handle(${i}, event)" title="Sposta questo dovere">▚▚</span>` : ''}
                    <div class="brutal-check flex-shrink-0"></div>
                    <span class="${textClass} break-words line-clamp-2 pr-2">${Utils.escapeHTML(task)}</span>
                </div>
                ${(!isJudged && !reorder) ? `<button onclick="Logic.removeTask(${i}, event)" class="px-2 sm:px-3 py-2 text-[9px] text-monolith-textDim hover:text-monolith-blood transition-all font-bold shrink-0 border border-transparent hover:border-monolith-blood bg-[#000] font-mono tracking-widest">DEL</button>` : ''}
                ${(reorder && i !== Reorder.srcIdx) ? `<span class="reorder-drop-tag font-mono text-[8px] font-black tracking-widest shrink-0">▸ QUI</span>` : ''}
            </div>`;
        }).join('');
        if (reorder) {
            const hint = document.createElement('div');
            hint.className = 'reorder-hint font-mono text-[9px] sm:text-[10px] font-black tracking-widest uppercase text-center';
            hint.innerHTML = '▚ MODALITÀ SPOSTAMENTO ATTIVA // TOCCA LA DESTINAZIONE // TOCCA DI NUOVO PER ANNULLARE';
            list.insertBefore(hint, list.firstChild);
        }
    },
    onTaskClick(i, e) {
        if (Reorder.active) { Reorder.place(i); return; }
        Logic.toggleTask(State.data.tasks[i]);
    },
    startDrag(e, idx) { Reorder.handle(idx, e); },
    fadeInModal(id) { const m = $(id); m.classList.remove('hidden'); m.style.display = 'flex'; setTimeout(() => m.classList.remove('opacity-0'), 10); },
    fadeOutModal(id, cb) { const m = $(id); m.classList.add('opacity-0'); setTimeout(() => { m.style.display = 'none'; m.classList.add('hidden'); if(cb) cb(); }, 200); },
    openPurgeModal() { AudioEngine.play('error'); Utils.triggerVibe([30, 30]); this.fadeInModal('purge-modal'); },
    closePurgeModal() { AudioEngine.play('type'); this.fadeOutModal('purge-modal'); },
    openBackupModal() { AudioEngine.play('check'); Utils.triggerVibe(15); $('backup-paste-area').value = ''; this.fadeInModal('backup-modal'); },
    closeBackupModal() { AudioEngine.play('type'); this.fadeOutModal('backup-modal'); },
    updateConfessionalCount() {
        const l = $('confessional-input').value.trim().length, cnt = $('confessional-count'), btn = $('confessional-submit');
        cnt.innerText = `${l} / 50`;
        if(l>=50) { cnt.classList.replace('text-monolith-blood','text-monolith-toxic'); btn.disabled=false; }
        else { cnt.classList.replace('text-monolith-toxic','text-monolith-blood'); btn.disabled=true; }
    },
    closeConfessional() { AudioEngine.play('type'); State.pendingUncheckTask = null; this.fadeOutModal('confessional-overlay'); },
    popToast(msg, isError = false) {
        const c = $('toast-container'), t = document.createElement('div');
        const b = isError ? 'border-monolith-blood text-monolith-blood bg-monolith-bloodDim/40' : 'border-white text-white bg-black/90';
        t.className = `border-2 ${b} backdrop-blur-sm px-4 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs font-mono font-bold shadow-[6px_6px_0px_rgba(0,0,0,0.8)] transform translate-x-[120%] transition-transform duration-300 flex items-center gap-3 max-w-[280px] tracking-widest`;
        t.innerHTML = `<span class="animate-pulse">>></span><span></span>`; c.appendChild(t);
        requestAnimationFrame(() => t.classList.remove('translate-x-[120%]'));
        const span = t.querySelector('span:last-child'); let i = 0;
        const intv = setInterval(() => { if (i < msg.length) span.innerText += msg.charAt(i++); else clearInterval(intv); }, 15);
        setTimeout(() => { t.classList.add('translate-x-[120%]'); setTimeout(() => t.remove(), 400); }, 4000);
    },
    popAchievement(id) {
        const ach = ACHIEVEMENTS.find(a => a.id === id); if(!ach) return;
        const c = $('toast-container'), t = document.createElement('div');
        t.className = `border-2 border-amber-400 text-amber-400 bg-amber-900/40 backdrop-blur-sm p-4 text-[10px] sm:text-xs font-mono shadow-[6px_6px_0px_rgba(0,0,0,0.8)] transform translate-x-[120%] transition-transform duration-300 max-w-[280px]`;
        t.innerHTML = `<div class="font-black tracking-widest mb-1 flex items-center gap-2"><span class="text-lg">${ach.icon}</span> OBIETTIVO SBLOCCATO</div><div class="text-white">${ach.title}</div>`;
        c.appendChild(t); AudioEngine.play('success');
        requestAnimationFrame(() => t.classList.remove('translate-x-[120%]'));
        setTimeout(() => { t.classList.add('translate-x-[120%]'); setTimeout(() => t.remove(), 400); }, 5000);
    },
    startProcessingOverlay(cb) {
        const o = $('processing-overlay'), logs = $('terminal-logs'), bar = $('load-bar'), pct = $('load-pct');
        o.classList.remove('hidden'); o.style.display = 'block'; setTimeout(() => o.classList.remove('opacity-0'), 10);
        logs.innerHTML = ''; bar.style.width = '0%'; pct.innerText = '0%';
        const phrases = ["> ESTRAZIONE PARAMETRI...", "> COMPILAZIONE STORICO...", "> CALCOLO CODARDIA...", "> CALCOLO LIVELLO...", "> SINTESI CHIRURGICA...", "> SINTESI VERDETTO..."];
        let step = 0, prog = 0; const intv = setInterval(() => AudioEngine.play('process'), 120);
        const adv = () => {
            prog += Math.random() * 18; if (prog > 100) prog = 100;
            bar.style.width = `${prog}%`; pct.innerText = `${Math.floor(prog)}%`;
            if (step < phrases.length && prog > (step * 25)) { const el = document.createElement('div'); el.innerText = phrases[step++]; logs.appendChild(el); }
            if (prog === 100) { clearInterval(intv); setTimeout(() => { o.classList.add('opacity-0'); setTimeout(() => { o.style.display = 'none'; cb(); }, 400); }, 600); } 
            else setTimeout(adv, 100 + Math.random() * 150);
        }; adv();
    },
    closeVerdict() {
        AudioEngine.play('type'); const vo = $('verdict-overlay'), vw = $('verdict-window');
        vo.classList.add('opacity-0'); vw.classList.add('translate-y-8');
        const h = State.data.history[State.activeDate];
        if (h && h.score !== null && h.score < 100) Corruption.set(0.15); else Corruption.set(0);
        setTimeout(() => { vo.style.display = 'none'; $('verdict-text').innerHTML = ''; }, 700);
    }
};

// Event Listeners di disaccoppiamento tra State e UI
document.addEventListener('osiris:statechange', () => UI.renderAll());
document.addEventListener('osiris:toast', (e) => UI.popToast(e.detail.msg, e.detail.error));
