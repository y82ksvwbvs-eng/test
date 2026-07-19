const Gamification = {
    MAX_LVL: 100,
    xpForLevelUp(lvl) { return 100 + Math.max(0, lvl - 1) * 50; },
    fromXP(totalXP) {
        let lvl = 1, acc = 0;
        while (lvl < this.MAX_LVL) {
            const need = this.xpForLevelUp(lvl);
            if (acc + need > totalXP) break;
            acc += need; lvl++;
        }
        return { level: lvl, xpInLevel: totalXP - acc, xpForNext: (lvl >= this.MAX_LVL ? 0 : this.xpForLevelUp(lvl)) };
    },
    nameOf(lvl) { return LEVEL_NAMES[Math.min(this.MAX_LVL, Math.max(1, lvl)) - 1]; },
    gradeOf(lvl) { return GRADES[Math.min(9, Math.floor((Math.max(1, lvl) - 1) / 10))]; },
    computeSessionXP(pct, streak) {
        if (pct === 100) return 100 + Math.min(200, (streak || 0) * 5);
        if (pct >= 50) return Math.round(pct * 0.5);
        return Math.round(pct * 0.15);
    },
    bossTier(pct) {
        if (pct >= 90) return { outcome: 'mythic', xp: 500, tag: "MYTHIC // VITTORIA MONUMENTALE", css: 'tier-mythic' };
        if (pct >= 75) return { outcome: 'gold', xp: 300, tag: "GOLD // VITTORIA CHIARA", css: 'tier-gold' };
        if (pct >= 60) return { outcome: 'silver', xp: 200, tag: "SILVER // VITTORIA DI PIRRO", css: 'tier-silver' };
        if (pct >= 45) return { outcome: 'bronze', xp: 100, tag: "BRONZE // SOPRAVVIVENZA", css: 'tier-bronze' };
        return { outcome: 'defeat', xp: 0, tag: "SCONFITTA UMILIANTE", css: '' };
    },
    checkAchievements() {
        const d = State.data;
        const unlocks = [];
        const unlock = (id) => { if (!d.achievements.includes(id)) { d.achievements.push(id); unlocks.push(id); } };

        if (Object.keys(d.history).filter(k => d.history[k].score !== null).length > 0) unlock('first_blood');
        if (d.bestStreak >= 7) unlock('streak_7');
        if (d.bestStreak >= 30) unlock('streak_30');
        if (d.totalTasksCompleted >= 100) unlock('total_100_tasks');
        if (d.totalTasksCompleted >= 500) unlock('total_500_tasks');
        
        const lvl = this.fromXP(d.xp).level;
        if (lvl >= 50) unlock('level_50');
        if (d.prestige > 0) unlock('prestige_1');

        if (unlocks.length > 0) {
            State.save();
            unlocks.forEach((id, i) => setTimeout(() => UI.popAchievement(id), i * 1500));
        }
    }
};

const TrophyUI = {
    open() {
        AudioEngine.play('success'); Utils.triggerVibe(20);
        const d = State.data;
        const total = ACHIEVEMENTS.length;
        const unlocked = ACHIEVEMENTS.filter(a => d.achievements.includes(a.id)).length;
        $('trophy-total-count').innerText = total;
        $('trophy-unlocked-count').innerText = unlocked;
        $('trophy-progress-bar').style.width = `${Math.round((unlocked/Math.max(1,total))*100)}%`;
        $('trophies-grid').innerHTML = ACHIEVEMENTS.map(a => {
            const un = d.achievements.includes(a.id);
            return `<div class="trophy-card ${un ? 'unlocked' : ''}">
                <div class="trophy-icon">${un ? a.icon : '🔒'}</div>
                <div class="trophy-title">${un ? a.title : '???'}</div>
                <div class="trophy-desc">${a.desc}</div>
                <div class="font-mono text-[8px] mt-1 tracking-widest ${un ? '' : 'text-monolith-textDim'}" style="${un ? 'color:#fbbf24' : ''}">${un ? '★ SBLOCCATO' : '// BLOCCATO'}</div>
            </div>`;
        }).join('');
        UI.fadeInModal('trophies-modal');
    },
    close() { AudioEngine.play('type'); UI.fadeOutModal('trophies-modal'); }
};
