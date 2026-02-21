const questions = [
    { q: "СКД деген эмне?", a: ["Отчетторду түзүүчү инструмент", "Код на языке 1С", "Справочник", "Макет"], c: 0 },
    { q: "Материалы отчетунда кайсы виртуалдык таблица колдонулат?", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 },
    { q: "Отчеттун макети эмнени аныктайт?", a: ["Запросту", "Визуалдык көрүнүштү", "Параметрди", "Ролду"], c: 1 },
    { q: "Начало периода кайсы жерде көрсөтүлөт?", a: ["Пользовательские настройки", "Свойства справочника", "Модуль объекта", "Запрос"], c: 0 },
    { q: "Запрос конструкторунда «>>» баскычы эмне кылат?", a: ["Баарын өчүрөт", "Бардык талааларды тандайт", "Отчетту жабат", "Кодду текшерет"], c: 1 }
];

let currentNick = "";
let timer;
let curQIdx = -1;

// --- ADMIN LOGIC ---
function login() {
    if(document.getElementById('admin-pass')?.value === "12345" || document.getElementById('pass')?.value === "12345") {
        document.getElementById('lock-zone').style.display = 'none';
        document.getElementById('controls').style.display = 'flex';
        let nav = document.getElementById('q-nav');
        nav.innerHTML = "";
        questions.forEach((_, i) => {
            nav.innerHTML += `<button onclick="setQ(${i})" style="margin:2px;">Q${i+1}</button>`;
        });
    }
}

function sendState(s) { db.ref('state').update({ status: s }); }
function setQ(i) { db.ref('state').update({ qIdx: i, status: 'running' }); }
function hardReset() { db.ref('/').set({ state: { status: 'waiting', qIdx: -1 }, players: {} }); location.reload(); }

// --- PLAYER LOGIC ---
function playerJoin() {
    currentNick = document.getElementById('nick').value.trim();
    if(!currentNick) return;
    const pRef = db.ref('players/' + currentNick);
    pRef.set({ score: 0 });
    pRef.onDisconnect().remove();
    document.getElementById('join-card').innerHTML = "<h2>ТЫ В ИГРЕ! ВНИМАНИЕ НА ЭКРАН</h2>";
}

function ans(idx) {
    if(idx === questions[curQIdx].c) {
        db.ref('players/' + currentNick + '/score').transaction(s => (s || 0) + 1000);
        alert("Correct!");
    } else { alert("Wrong!"); }
}

// --- SYNC ENGINE ---
db.ref('state').on('value', snap => {
    const s = snap.val() || {};
    curQIdx = s.qIdx;
    
    if(s.status === 'running' && curQIdx >= 0) {
        switchScreen('game-view');
        renderQ(curQIdx);
    } else if(s.status === 'waiting') {
        switchScreen('lobby-view');
        document.getElementById('join-card').style.display = 'block';
    } else if(s.status === 'stopped') {
        switchScreen('final-view');
    }
});

db.ref('players').on('value', snap => {
    const data = snap.val() || {};
    const chips = document.getElementById('player-chips');
    const winners = document.getElementById('winners-podium');
    chips.innerHTML = ""; winners.innerHTML = "";
    
    const sorted = Object.entries(data).sort((a,b) => b[1].score - a[1].score);
    sorted.forEach(([n, d]) => {
        chips.innerHTML += `<div class="chip">${n}</div>`;
        winners.innerHTML += `<h2>${n}: ${d.score}</h2>`;
    });
});

function renderQ(idx) {
    const q = questions[idx];
    document.getElementById('q-title').innerText = q.q;
    const texts = document.querySelectorAll('.k-btn .t');
    q.a.forEach((txt, i) => texts[i].innerText = txt);
    
    let l = 20;
    document.getElementById('t-left').innerText = l;
    clearInterval(timer);
    timer = setInterval(() => {
        l--;
        document.getElementById('t-left').innerText = l;
        if(l <= 0) clearInterval(timer);
    }, 1000);
}

function switchScreen(id) {
    ['lobby-view', 'game-view', 'final-view'].forEach(s => document.getElementById(s).style.display = 'none');
    document.getElementById(id).style.display = (id === 'game-view') ? 'flex' : 'flex';
}
