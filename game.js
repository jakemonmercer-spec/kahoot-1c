// 1. КОНСТАНТЫ ВОПРОСОВ
const QUIZ_DATA = [
    { q: "СКД (Система компоновки данных) деген эмне?", a: ["Отчетторду түзүүчү инструмент", "Программа коду", "Справочник", "Макет"], c: 0 },
    { q: "Материалы отчетунда кайсы виртуалдык таблица колдонулат?", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 },
    { q: "Отчеттун макети эмнени аныктайт?", a: ["Запросту", "Визуалдык көрүнүштү", "Параметрди", "Ролду"], c: 1 },
    { q: "Начало периода кайсы жерде көрсөтүлөт?", a: ["Пользовательские настройки", "Свойства справочника", "Модуль объекта", "Запрос"], c: 0 },
    { q: "Запрос конструкторунда «>>» баскычы эмне кылат?", a: ["Баарын өчүрөт", "Бардык талааларды тандайт", "Отчетту жабат", "Кодду текшерет"], c: 1 }
];

// Глобальные переменные для работы таймера и состояний
let myNick = "";
let currentQIdx = -1;
let canHit = false;
let autoTimer;
let countdownInterval;

// --- ЛОГИКА ИГРОКА (User) ---
const User = {
    async join() {
        myNick = document.getElementById('p-nick').value.trim();
        if (!myNick) return alert("Nickname жазыңыз!");

        const playerRef = db.ref('players/' + myNick);

        // Проверка на дубликаты и подхват сессии
        const snapshot = await playerRef.once('value');
        if (snapshot.exists()) {
            alert("С возвращением, " + myNick + "!");
        } else {
            await playerRef.set({ score: 0 });
        }

        // КОНТРОЛЬ АКТИВНОСТИ: Удаление из базы при закрытии вкладки
        playerRef.onDisconnect().remove();

        // Скрываем форму входа
        document.getElementById('join-card').innerHTML = `<h2 style="color:#333">Сиз оюндасыз: ${myNick}</h2>`;
    },

    hit(idx) {
        if (!canHit) return;
        canHit = false;
        
        // Визуальный отклик (затемняем кнопки после нажатия)
        document.getElementById('ans-grid').style.opacity = "0.3";

        if (idx === QUIZ_DATA[currentQIdx].c) {
            let timeLeft = parseInt(document.getElementById('timer-sec').innerText);
            // Расчет баллов: 500 база + бонус за скорость
            let points = 500 + (timeLeft * 25);
            db.ref('players/' + myNick + '/score').transaction(s => (s || 0) + points);
        }
    }
};

// --- ЛОГИКА ПРЕПОДАВАТЕЛЯ (Admin) ---
const Admin = {
    login() {
        const pin = document.getElementById('pin').value;
        if (pin === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
        } else {
            alert("Ката PIN!");
        }
    },

    setStep(step) {
        db.ref('game').update({ step: step });
    },

    // ПОЛНЫЙ АВТОПИЛОТ: Цикл игры
    async runAuto() {
        if (!confirm("Авто-квизди баштоо?")) return;

        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // 1. Экран "Приготовьтесь" (3 секунды)
            await db.ref('game').update({ step: 'getready', qIdx: i });
            await new Promise(r => setTimeout(r, 3000));

            // 2. Экран Вопроса (20 секунд)
            await db.ref('game').update({ step: 'game' });
            await new Promise(r => setTimeout(r, 20500));

            // 3. Экран Результатов (5 секунд)
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 5000));
        }

        // 4. Финальный Пьедестал
        this.setStep('podium');
    },

    // Полный сброс всей базы
    reset() {
        if (confirm("Баарын өчүрүү?")) {
            db.ref('/').set({
                game: { step: 'lobby', qIdx: -1 },
                players: {}
            });
            location.reload();
        }
    }
};

// --- СИСТЕМА СИНХРОНИЗАЦИИ (Core) ---

// 1. Следим за состоянием игры (какой экран у всех)
db.ref('game').on('value', snap => {
    const state = snap.val() || { step: 'lobby', qIdx: -1 };
    currentQIdx = state.qIdx;

    // Смена экранов через CSS класс 'active'
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetView = document.getElementById('view-' + state.step);
    if (targetView) targetView.classList.add('active');

    // Если перешли на экран вопроса - запускаем таймер и отрисовку
    if (state.step === 'game') {
        startLocalQuestion();
    }
});

// 2. Следим за списком игроков и рейтингом
db.ref('players').on('value', snap => {
    const pData = snap.val() || {};
    const sorted = Object.entries(pData).sort((a, b) => b[1].score - a[1].score);

    // Обновление Лобби (ники в реальном времени)
    const lobbyContainer = document.getElementById('player-tags');
    if (lobbyContainer) {
        lobbyContainer.innerHTML = sorted.map(([name]) => `<div class="tag">${name}</div>`).join('');
    }
    
    const counter = document.getElementById('online-counter');
    if (counter) counter.innerText = Object.keys(pData).length + " игроков онлайн";

    // Обновление промежуточного рейтинга и финального подиума
    const podiumHtml = sorted.slice(0, 5).map(([name, data], i) => `
        <div class="podium-row">
            <span>${i + 1}. ${name}</span>
            <b>${data.score}</b>
        </div>
    `).join('');

    const resBox = document.getElementById('round-leaderboard');
    if (resBox) resBox.innerHTML = podiumHtml;

    const finalBox = document.getElementById('podium-final');
    if (finalBox) finalBox.innerHTML = podiumHtml;

    // Обновление счетчика ответов на экране вопроса
    const ansCount = document.getElementById('ans-count');
    if (ansCount) ansCount.innerText = Object.keys(pData).length;
});

// Функция запуска вопроса на каждом устройстве
function startLocalQuestion() {
    canHit = true;
    document.getElementById('ans-grid').style.opacity = "1";
    
    const q = QUIZ_DATA[currentQIdx];
    document.getElementById('q-text').innerText = q.q;
    
    const buttons = document.querySelectorAll('.ans-btn .t');
    q.a.forEach((text, i) => {
        if (buttons[i]) buttons[i].innerText = text;
    });

    // Локальный таймер для синхронизации
    let timeLeft = 20;
    document.getElementById('timer-sec').innerText = timeLeft;
    
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-sec').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            canHit = false;
            document.getElementById('ans-grid').style.opacity = "0.4";
        }
    }, 1000);
}
