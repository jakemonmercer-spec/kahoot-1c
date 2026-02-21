const questions = [
    { q: "СКД деген эмне?", a: ["Отчетторду түзүүчү инструмент", "Программа коду", "Справочник", "Макет"], c: 0 },
    { q: "Материалы отчетунда кайсы виртуалдык таблица колдонулат?", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 },
    { q: "Отчеттун макети эмнени аныктайт?", a: ["Запросту", "Визуалдык көрүнүштү", "Параметрди", "Ролду"], c: 1 },
    { q: "Начало периода кайсы жерде көрсөтүлөт?", a: ["Пользовательские настройки", "Свойства справочника", "Модуль объекта", "Запрос"], c: 0 },
    { q: "Запрос конструкторунда «>>» баскычы эмне кылат?", a: ["Баарын өчүрөт", "Бардык талааларды тандайт", "Отчетту жабат", "Кодду текшерет"], c: 1 }
];

let myNick = ""; let qIdx = -1; let timer; let canHit = false; let isAdmin = false;

// --- ADMIN ---
function authAdmin() {
    if(document.getElementById('adm-pass').value === "123") {
        isAdmin = true;
        document.getElementById('auth-zone').style.display = 'none';
        document.getElementById('adm-ctrl').style.display = 'flex';
    }
}
function setStep(s) { db.ref('state').update({ step: s }); }

async function startAutoQuiz() {
    for(let i=0; i < questions.length; i++) {
        await db.ref('state').update({ step: 'game', qIdx: i, startTime: Date.now() });
        await new Promise(r => setTimeout(r, 20500)); // Ждем вопрос (20 сек)
        await db.ref('state').update({ step: 'results' });
        await new Promise(r => setTimeout(r, 5000));  // Ждем результаты (5 сек)
    }
    setStep('podium');
}

function systemReset() { db.ref('/').set({ state: { step: 'wait', qIdx: -1 }, players: {} }); location.reload(); }

// --- PLAYER ---
function join() {
    myNick = document.getElementById('player-nick').value.trim();
    if(!myNick) return;
    db.ref('players/' + myNick).set({ score: 0 });
    db.ref('players/' + myNick).onDisconnect().remove();
    document.getElementById('join-ui').innerHTML = "<h2 class='pulse'>ВЫ В ИГРЕ!</h2>";
}

function hit(i) {
    if(!canHit) return;
    canHit = false;
    document.getElementById('ans-grid').style.opacity = "0.3";
    if(i === questions[qIdx].c) {
        let sec = parseInt(document.getElementById('timer-sec').innerText);
        db.ref('players/' + myNick + '/score').transaction(s => (s || 0) + (500 + sec*25));
    }
}

// --- SYNC ---
db.ref('state').on('value', snap => {
    const s = snap.val() || {};
    qIdx = s.qIdx;
    showView('view-' + s.step);
    if(s.step === 'game') renderQuestion(qIdx);
});

db.ref('players').on('value', snap => {
    const p = snap.val() || {};
    const lobby = document.getElementById('lobby-players');
    const feed = document.getElementById('score-feed');
    const podium = document.getElementById('podium-list');
    lobby.innerHTML = ""; feed.innerHTML = ""; podium.innerHTML = "";
    
    const sorted = Object.entries(p).sort((a,b) => b[1].score - a[1].score);
    sorted.forEach(([n]) => lobby.innerHTML += `<div class="chip">${n}</div>`);
    sorted.slice(0, 5).forEach(([n, d], i) => {
        const item = `<div class="pod-item"><span>${i+1}. ${n}</span> <b>${d.score}</b></div>`;
        feed.innerHTML += item;
        podium.innerHTML += item;
    });
    document.getElementById('ans-stat').innerText = Object.keys(p).length + " Answers";
});

function renderQuestion(idx) {
    canHit = true;
    document.getElementById('ans-grid').style.opacity = "1";
    const q = questions[idx];
    document.getElementById('q-text').innerText = q.q;
    const btnTs = document.querySelectorAll('.ans-btn .t');
    q.a.forEach((t, i) => btnTs[i].innerText = t);
    
    let left = 20;
    document.getElementById('timer-sec').innerText = left;
    document.getElementById('timer-fill').style.width = "100%";
    
    clearInterval(timer);
    timer = setInterval(() => {
        left--;
        document.getElementById('timer-sec').innerText = left;
        document.getElementById('timer-fill').style.width = (left/20*100) + "%";
        if(left <= 0) { clearInterval(timer); canHit = false; }
    }, 1000);
}

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
