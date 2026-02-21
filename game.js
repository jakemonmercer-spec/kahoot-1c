const questions = [
    { q: "СКД (Система компоновки данных) деген эмне?", a: ["Отчетторду түзүүчү инструмент", "Программа коду", "Справочник", "Макет"], c: 0 },
    { q: "Материалы отчетунда кайсы виртуалдык таблица колдонулат?", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 },
    { q: "Отчеттун визуалдык көрүнүшү эмне деп аталат?", a: ["Форма", "Макет", "Запрос", "Ресурс"], c: 1 }
];

let myName = "";
let timer;
let timeLeft = 20;
let currentQIdx = -1;

// Вход в игру
function joinGame() {
    myName = document.getElementById('username').value.trim();
    if(!myName) return alert("Введите Nickname!");
    
    db.ref('players/' + myName).set({ score: 0 });
    db.ref('players/' + myName).onDisconnect().remove();
    
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('question-screen').style.display = 'flex';
    listenToGame();
}

// Слушатели базы данных
function listenToGame() {
    // 1. Кто сейчас в игре (Лобби)
    db.ref('players').on('value', snap => {
        const players = snap.val() || {};
        const lobbyList = document.getElementById('player-list');
        const scoreList = document.getElementById('leader-list');
        
        lobbyList.innerHTML = "";
        scoreList.innerHTML = "";
        
        const sorted = Object.entries(players).sort((a,b) => b[1].score - a[1].score);
        
        sorted.forEach(([name, data]) => {
            lobbyList.innerHTML += `<div class="player-tag">${name}</div>`;
            scoreList.innerHTML += `<li>${name}: <b>${data.score}</b></li>`;
        });
    });

    // 2. Какой сейчас вопрос
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
    q.a.forEach((text, i) => { btns[i].parentElement.style.display = "flex"; btns[i].innerText = text; });
    
    timeLeft = 20;
    document.getElementById('timer-val').innerText = timeLeft;
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-val').innerText = timeLeft;
        if(timeLeft <= 0) { clearInterval(timer); }
    }, 1000);
}

function submitAns(ansIdx) {
    if(currentQIdx === -1) return;
    if(ansIdx === questions[currentQIdx].c) {
        let points = 500 + (timeLeft * 25); 
        db.ref('players/' + myName + '/score').transaction(s => (s || 0) + points);
        alert("Правильно! +" + points);
    } else {
        alert("Неверно!");
    }
    document.getElementById('answers-grid').style.pointerEvents = "none";
    setTimeout(() => { document.getElementById('answers-grid').style.pointerEvents = "auto"; }, 2000);
}

// Админка
const adminControls = document.getElementById('admin-controls');
questions.forEach((_, i) => {
    const b = document.createElement('button');
    b.innerText = "Вопрос " + (i+1);
    b.onclick = () => db.ref('currentQuestion').set(i);
    adminControls.appendChild(b);
});

function resetAll() {
    db.ref('/').set({ currentQuestion: -1, players: {} });
    location.reload();
}
