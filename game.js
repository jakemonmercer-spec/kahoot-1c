const questions = [
    { q: "СКД деген эмне?", a: ["Отчетторду түзүүчү", "Справочник", "Макет", "Код"], c: 0 },
    { q: "Виртуалдык таблицаны тандаңыз:", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 }
];

let myName = "";
let timer;

function joinGame() {
    myName = document.getElementById('username').value.trim();
    if(!myName) return alert("Введите ник!");
    db.ref('players/' + myName).set({ score: 0 });
    db.ref('players/' + myName).onDisconnect().remove();
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('question-screen').style.display = 'block';
    listenToGame();
}

function listenToGame() {
    db.ref('currentQuestion').on('value', snap => {
        const qIdx = snap.val();
        if(qIdx === -1 || qIdx === null) {
            document.getElementById('question-screen').style.display = 'none';
            document.getElementById('lobby').style.display = 'block';
        } else {
            showQuestion(qIdx);
        }
    });

    db.ref('players').on('value', snap => {
        const players = snap.val() || {};
        const list = document.getElementById('leader-list');
        list.innerHTML = "";
        Object.entries(players).sort((a,b) => b[1].score - a[1].score).forEach(([n, d]) => {
            list.innerHTML += `<li>${n}: ${d.score}</li>`;
        });
    });
}

function showQuestion(idx) {
    const q = questions[idx];
    document.getElementById('question-text').innerText = q.q;
    const btns = document.querySelectorAll('.ans-btn .text');
    q.a.forEach((text, i) => btns[i].innerText = text);
    
    let timeLeft = 20;
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-val').innerText = timeLeft;
        if(timeLeft <= 0) clearInterval(timer);
    }, 1000);
}

function submitAns(ansIdx) {
    const qIdx = parseInt(adminCurrentQ); // Упрощенно
    if(ansIdx === questions[0].c) { // Пример для 1 вопроса
        db.ref('players/' + myName + '/score').transaction(s => (s || 0) + 1000);
    }
    alert("Ответ принят!");
}

// Админка
const adminPanel = document.getElementById('admin-controls');
questions.forEach((_, i) => {
    const b = document.createElement('button');
    b.innerText = "Вопрос " + (i+1);
    b.onclick = () => db.ref('currentQuestion').set(i);
    adminPanel.appendChild(b);
});

function resetAll() {
    db.ref('/').set({ currentQuestion: -1, players: {} });
    location.reload();
}
