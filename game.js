const questions = [
    { q: "СКД деген эмне?", a: ["Отчетторду түзүүчү", "Справочник", "Макет", "Код"], c: 0 },
    { q: "Виртуалдык таблицаны тандаңыз:", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 },
    { q: "Отчеттун көрүнүшү бул...", a: ["Запрос", "Макет", "Форма", "Ресурс"], c: 1 }
];

let myName = "";
let timer;
let timeLeft = 20;
let currentQIdx = -1;

function joinGame() {
    myName = document.getElementById('username').value.trim();
    if(!myName) return alert("Введите ник!");
    db.ref('players/' + myName).set({ score: 0 });
    db.ref('players/' + myName).onDisconnect().remove();
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('question-screen').style.display = 'flex';
}

function listenToGame() {
    db.ref('players').on('value', snap => {
        const players = snap.val() || {};
        const lobbyList = document.getElementById('player-list');
        lobbyList.innerHTML = "";
        Object.keys(players).forEach(name => {
            lobbyList.innerHTML += `<div class="player-tag" style="background:rgba(255,255,255,0.2); padding:10px; margin:5px; border-radius:5px;">${name}</div>`;
        });
    });

    db.ref('currentQuestion').on('value', snap => {
        currentQIdx = snap.val();
        if(currentQIdx === -1 || currentQIdx === null) {
            document.getElementById('question-screen').style.display = 'none';
            document.getElementById('lobby').style.display = 'flex';
        } else {
            document.getElementById('lobby').style.display = 'none';
            document.getElementById('question-screen').style.display = 'flex';
            showQuestion(currentQIdx);
        }
    });
}

function showQuestion(idx) {
    const q = questions[idx];
    document.getElementById('question-text').innerText = q.q;
    const btns = document.querySelectorAll('.ans-btn .text');
    q.a.forEach((text, i) => { btns[i].innerText = text; });
    
    timeLeft = 20;
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-val').innerText = timeLeft;
        if(timeLeft <= 0) clearInterval(timer);
    }, 1000);
}

function submitAns(ansIdx) {
    if(currentQIdx === -1) return;
    if(ansIdx === questions[currentQIdx].c) {
        let points = 500 + (timeLeft * 25);
        db.ref('players/' + myName + '/score').transaction(s => (s || 0) + points);
        alert("Правильно!");
    } else {
        alert("Неверно!");
    }
}

// Рендер кнопок админа
const adminPanel = document.getElementById('admin-controls');
questions.forEach((_, i) => {
    const b = document.createElement('button');
    b.innerText = "Q" + (i+1);
    b.onclick = () => db.ref('currentQuestion').set(i);
    adminPanel.appendChild(b);
});

function resetAll() {
    db.ref('/').set({ currentQuestion: -1, players: {} });
}

// ЗАПУСКАТЬ СЛУШАТЕЛЬ СРАЗУ
listenToGame();
