const DATA = [
    { q: "СКД (Система компоновки данных) деген эмне?", a: ["Отчетторду түзүүчү инструмент", "Программа коду", "Справочник", "Макет"], c: 0 },
    { q: "Материалы отчетунда кайсы виртуалдык таблица колдонулат?", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 },
    { q: "Отчеттун макети эмнени аныктайт?", a: ["Запросту", "Визуалдык көрүнүштү", "Параметрди", "Ролду"], c: 1 },
    { q: "Начало периода кайсы жерде көрсөтүлөт?", a: ["Пользовательские настройки", "Свойства справочника", "Модуль объекта", "Запрос"], c: 0 },
    { q: "Запрос конструкторунда «>>» баскычы эмне кылат?", a: ["Баарын өчүрөт", "Бардык талааларды тандайт", "Отчетту жабат", "Кодду текшерет"], c: 1 }
];

const User = {
    nick: "",
    qIdx: -1,
    canHit: false,
    join() {
        this.nick = document.getElementById('p-nick').value.trim();
        if(!this.nick) return;
        const ref = db.ref('players/' + this.nick);
        ref.set({ score: 0 });
        ref.onDisconnect().remove();
        document.getElementById('join-card').innerHTML = "<h2 style='color:#333'>Вы в лобби!</h2>";
    },
    hit(idx) {
        if(!this.canHit) return;
        this.canHit = false;
        document.getElementById('ans-grid').style.opacity = "0.4";
        if(idx === DATA[this.qIdx].c) {
            let sec = parseInt(document.getElementById('timer-sec').innerText);
            db.ref('players/' + this.nick + '/score').transaction(s => (s || 0) + (500 + sec*25));
        }
    }
};

const Admin = {
    auth() {
        if(document.getElementById('pin').value === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
        }
    },
    setStep(s) { db.ref('game/step').set(s); },
    async run() {
        for(let i=0; i < DATA.length; i++) {
            await db.ref('game').update({ step: 'getready', qIdx: i });
            await new Promise(r => setTimeout(r, 3000));
            await db.ref('game').update({ step: 'game' });
            await new Promise(r => setTimeout(r, 20500));
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 4000));
        }
        this.setStep('podium');
    },
    clear() { db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} }); location.reload(); }
};

// СИНХРОНИЗАЦИЯ
db.ref('game').on('value', snap => {
    const s = snap.val() || {};
    User.qIdx = s.qIdx;
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('view-' + s.step);
    if(target) target.classList.add('active');

    if(s.step === 'game') {
        User.canHit = true;
        document.getElementById('ans-grid').style.opacity = "1";
        const q = DATA[s.qIdx];
        document.getElementById('q-text').innerText = q.q;
        const txts = document.querySelectorAll('.ans-btn .t');
        q.a.forEach((t, i) => txts[i].innerText = t);
        
        let sec = 20;
        document.getElementById('timer-sec').innerText = sec;
        clearInterval(window.tmr);
        window.tmr = setInterval(() => {
            sec--;
            document.getElementById('timer-sec').innerText = sec;
            if(sec <= 0) clearInterval(window.tmr);
        }, 1000);
    }
});

db.ref('players').on('value', snap => {
    const p = snap.val() || {};
    const sorted = Object.entries(p).sort((a,b) => b[1].score - a[1].score);
    document.getElementById('player-tags').innerHTML = sorted.map(([n]) => `<div class="tag">${n}</div>`).join('');
    document.getElementById('online-counter').innerText = sorted.length + " игроков";
    const podiumHtml = sorted.slice(0, 5).map(([n, d], i) => `<div class="podium-row"><span>${i+1}. ${n}</span><b>${d.score}</b></div>`).join('');
    document.getElementById('round-leaderboard').innerHTML = podiumHtml;
    document.getElementById('final-podium').innerHTML = podiumHtml;
    document.getElementById('ans-count').innerText = sorted.length;
});
