const State = {
    data: {
        schemaVersion: CONFIG.SCHEMA_VERSION, tasks: [], history: {}, streak: 0, bestStreak: 0,
        lastJudged: null, targetTasks: 1, xp: 0, lastBossWeek: null, bossHistory: {},
        achievements: [], prestige: 0, totalTasksCompleted: 0, totalTasksMissed: 0,
        bossWeek: null, bossDmg: 0, bossHeal: 0, confessions: []
    },
    activeDate: Utils.todayStr(),
    currentCalendarDate: new Date(),
    pendingUncheckTask: null,

    load() {
        try {
            const raw = localStorage.getItem(CONFIG.STORE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.migrate(parsed);
            }
        } catch(e) {
            console.warn("Corrupted save, attempting backup restore...");
            this.restoreBackup();
        }
        if (!this.data.history[this.activeDate]) this.data.history[this.activeDate] = { comp: [], score: null };
        this.checkDayChange();
        
        // CRITICAL FIX: Nessuna chiamata diretta a UI. Disaccoppiamento tramite evento.
        document.dispatchEvent(new CustomEvent('osiris:statechange'));
    },
    migrate(old) {
        const v = old.schemaVersion || 1;
        this.data = { ...this.data, ...old, schemaVersion: CONFIG.SCHEMA_VERSION };
        if (v < 3) {
            if (!this.data.achievements) this.data.achievements = [];
            if (typeof this.data.prestige !== 'number') this.data.prestige = 0;
            if (typeof this.data.totalTasksCompleted !== 'number') this.data.totalTasksCompleted = 0;
            if (typeof this.data.totalTasksMissed !== 'number') this.data.totalTasksMissed = 0;
            if (typeof this.data.xp !== 'number') this.data.xp = 0;
            if (typeof this.data.bossDmg !== 'number') this.data.bossDmg = 0;
            if (typeof this.data.bossHeal !== 'number') this.data.bossHeal = 0;
            if (typeof this.data.bossWeek !== 'string' && this.data.bossWeek !== null) this.data.bossWeek = null;
        }
        if (!Array.isArray(this.data.confessions)) this.data.confessions = [];
    },
    save() {
        localStorage.setItem(CONFIG.BACKUP_KEY, JSON.stringify(this.data));
        localStorage.setItem(CONFIG.STORE_KEY, JSON.stringify(this.data));
        document.dispatchEvent(new CustomEvent('osiris:statechange'));
    },
    restoreBackup() {
        try {
            const b = localStorage.getItem(CONFIG.BACKUP_KEY);
            if (b) { 
                this.migrate(JSON.parse(b)); 
                document.dispatchEvent(new CustomEvent('osiris:toast', { detail: { msg: "RIPRISTINO DA BACKUP INTERNO.", error: true } }));
            }
        } catch(e) { 
            document.dispatchEvent(new CustomEvent('osiris:toast', { detail: { msg: "ERRORE FATALE STORAGE.", error: true } }));
        }
    },
    checkDayChange() {
        const today = Utils.todayStr();
        if (this.activeDate !== today) {
            this.activeDate = today;
            if (!this.data.history[today]) this.data.history[today] = { comp: [], score: null };
            
            if (this.data.lastJudged) {
                const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                const yStr = Utils.dateToStr(yesterday);
                const yData = this.data.history[yStr];
                if (!yData || yData.score !== 100) {
                    if (this.data.lastJudged !== this.activeDate) this.data.streak = 0;
                }
            }
            this.save();
        }
    }
};
