const questions = [
    { q: "СКД (Система компоновки данных) деген эмне?", a: ["Отчетторду түзүүчү инструмент", "Программа коду", "Справочник", "Макет"], c: 0, s: ["▲","◆","●","■"] },
    { q: "Материалы отчетунда кайсы виртуалдык таблица колдонулат?", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2, s: ["▲","◆","●","■"] },
    { q: "Отчеттун визуалдык көрүнүшү эмне деп аталат?", a: ["Форма", "Макет", "Запрос", "Ресурс"], c: 1, s: ["▲","◆","●","■"] },
    { q: "Начало периода кайсы жерде көрсөтүлөт?", a: ["Пользовательские настройки", "Свойства справочника", "Модуль объекта", "Запрос"], c: 0, s: ["▲","◆","●","■"] },
    { q: "Запрос конструкторунда «>>» баскычы эмне кылат?", a: ["Баарын өчүрөт", "Бардык талааларды тандайт", "Отчетту жабат", "Кодду текшерет"], c: 1, s: ["▲","◆","●","■"] }
];

let myName = "";
let canAnswer = false;
let timer;

function joinGame() {
    myName = document.getElementById('username').value.trim();
    if (!myName) return alert("Введите имя!");

    const pRef = db.ref('players/' + myName);
    pRef.set({ score: 0 });
    pRef.onDisconnect().remove();

    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    startSync();
}

function startSync() {
    // Слушаем текущий вопрос
    db.ref('currentQuestion').on('value', snap => {
        const qIdx = snap.val();
        if (qIdx === -1 || qIdx === null) {
            showWaiting();
        } else {
            displayQuestion(qIdx);
        }
    });

    // Слушаем рейтинг
    db.ref('players').on('value', snap => {
        const players = snap.val() || {};
        const list = document.getElementById('leaderboard');
        list.innerHTML = "";
        Object.entries(players)
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, 5)
            .forEach(([name, data]) => {
                list.innerHTML += `<li><span>${name}</span> <b>${data.score}</b></li>`;
            });
    });
}

function showWaiting() {
    clearInterval(timer);
    document.getElementById('question-text').innerText = "Внимание на экран ведущего!";
    document.getElementById('answers-grid').innerHTML = "";
    document.getElementById('timer-circle').innerText = "!";
}

function displayQuestion(idx) {
    canAnswer = true;
    const q = questions[idx];
    document.getElementById('question-text').innerText = q.q;
    const grid = document.getElementById('answers-grid');
    grid.innerHTML = "";

    let timeLeft = 20;
    document.getElementById('timer-circle').innerText = timeLeft;

    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-circle').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            canAnswer = false;
            grid.innerHTML = "<h2>Время вышло!</h2>";
        }
    }, 1000);

    q.a.forEach((ans, i) => {
        grid.innerHTML += `
            <button class="ans-btn ans-${i}" onclick="sendAnswer(${idx}, ${i}, ${timeLeft})">
                <span class="shape">${q.s[i]}</span> ${ans}
            </button>`;
    });
}

function sendAnswer(qIdx, ansIdx, sec) {
    if (!canAnswer) return;
    canAnswer = false;

    if (ansIdx === questions[qIdx].c) {
        const points = 500 + (sec * 25); // Чем быстрее, тем больше баллов
        db.ref('players/' + myName + '/score').transaction(s => (s || 0) + points);
        document.getElementById('answers-grid').innerHTML = `<h2>Правильно! +${points}</h2>`;
    } else {
        document.getElementById('answers-grid').innerHTML = "<h2>Ошибка...</h2>";
    }
}

// Админ функции
function launch(idx) { db.ref('currentQuestion').set(idx); }
function resetAll() { db.ref('/').set({ currentQuestion: -1, players: {} }); location.reload(); }

// Генерация админ кнопок
const adminArea = document.getElementById('admin-btns');
questions.forEach((_, i) => {
    adminArea.innerHTML += `<button onclick="launch(${i})" style="margin:5px; padding:10px; cursor:pointer;">Вопрос ${i+1}</button>`;
});
