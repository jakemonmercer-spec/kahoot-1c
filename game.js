const QUIZ_DATA = [
    { q: "СКД (Система компоновки данных) деген эмне?", a: ["Отчетторду түзүүчү инструмент", "Программа коду", "Справочник", "Макет"], c: 0 },
    { q: "Материалы отчетунда кайсы виртуалдык таблица колдонулат?", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 },
    { q: "Отчеттун макети эмнени аныктайт?", a: ["Запросту", "Визуалдык көрүнүштү", "Параметрди", "Ролду"], c: 1 },
    { q: "Начало периода кайсы жерде көрсөтүлөт?", a: ["Пользовательские настройки", "Свойства справочника", "Модуль объекта", "Запрос"], c: 0 },
    { q: "Запрос конструкторунда «>>» баскычы эмне кылат?", a: ["Баарын өчүрөт", "Бардык талааларды тандайт", "Отчетту жабат", "Кодду текшерет"], c: 1 }
];

const Game = {
    nick: "",
    qIdx: -1,
    canHit: false,
    myScore: 0,

    join() {
        this.nick = document.getElementById('p-name').value.trim();
        if (!this.nick) return alert("Введите имя!");
        const pRef = db.ref('players/' + this.nick);
        pRef.set({ score: 0, lastAns: -1 });
        pRef.onDisconnect().remove();
        document.getElementById('player-auth-form').innerHTML = "<h2>Вы в игре! Ожидайте...</h2>";
    },

    hit(idx) {
        if (!this.canHit) return;
        this.canHit = false;
        document.getElementById('ans-grid').style.opacity = "0.3";
        if (idx === QUIZ_DATA[this.qIdx].c) {
            let time = parseInt(document.getElementById('timer-sec').innerText);
            let points = 500 + (time * 25);
            db.ref('players/' + this.nick + '/score').transaction(s => (s || 0) + points);
        }
    }
};

const Admin = {
    login() {
        if (document.getElementById('adm-pass').value === "123") {
            document.getElementById('admin-login').style.display = 'none';
            document.getElementById('admin-tools').style.display = 'flex';
        }
    },

    setStep(step) { db.ref('game/step').set(step); },

    async runAuto() {
        for (let i = 0; i < QUIZ_DATA.length; i++) {
            await db.ref('game').update({ step: 'getready', qIdx: i });
            await new Promise(r => setTimeout(r, 3000));
            await db.ref('game').update({ step: 'question' });
            await new Promise(r => setTimeout(r, 20500));
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 5000));
        }
        this.setStep('podium');
    },

    next() {
        db.ref('game/qIdx').transaction(idx => (idx === null ? 0 : idx + 1));
        this.setStep('question');
    },

    reset() {
        db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
        location.reload();
    }
};

// СИНХРОНИЗАЦИЯ
db.ref('game').on('value', snap => {
    const state = snap.val() || {};
    Game.qIdx = state.qIdx;
    
    // Переключение экранов
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('screen-' + state.step);
    if (target) target.classList.add('active');

    if (state.step === 'question') startQuestionTimer();
});

db.ref('players').on('value', snap => {
    const p = snap.val() || {};
    const sorted = Object.entries(p).sort((a, b) => b[1].score - a[1].score);
    
    // Обновление Лобби
    const lobby = document.getElementById('player-tags');
    lobby.innerHTML = sorted.map(([name]) => `<div class="tag">${name}</div>`).join('');
    document.getElementById('player-count').innerText = Object.keys(p).length + " Players";

    // Лидерборд и Подиум
    const listHtml = sorted.slice(0, 5).map(([n, d], i) => 
        `<div class="pod-row"><span>${i+1}. ${n}</span> <b>${d.score}</b></div>`).join('');
    document.getElementById('top-score-list').innerHTML = listHtml;
    document.getElementById('final-podium').innerHTML = listHtml;

    // Личный счет игрока
    if (Game.nick && p[Game.nick]) {
        document.getElementById('player-personal-score').innerText = "Баллы: " + p[Game.nick].score;
    }
});

let interval;
function startQuestionTimer() {
    Game.canHit = true;
    document.getElementById('ans-grid').style.opacity = "1";
    const q = QUIZ_DATA[Game.qIdx];
    document.getElementById('q-text').innerText = q.q;
    const btnTexts = document.querySelectorAll('.ans-item .tx');
    q.a.forEach((t, i) => btnTexts[i].innerText = t);

    let sec = 20;
    document.getElementById('timer-sec').innerText = sec;
    clearInterval(interval);
    interval = setInterval(() => {
        sec--;
        document.getElementById('timer-sec').innerText = sec;
        if (sec <= 0) { clearInterval(interval); Game.canHit = false; }
    }, 1000);
}
