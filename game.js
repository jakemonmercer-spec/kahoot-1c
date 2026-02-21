// 1. КОНСТАНТЫ И ДАННЫЕ (Лабораторная №6)
const QUIZ_DATA = [
    { q: "Для чего предназначен объект 'Отчет' в 1С?", a: ["Для ввода данных", "Для анализа и вывода сводной информации", "Для хранения списка сотрудников", "Для удаления записей"], c: 1 },
    { q: "Какой инструмент используется в 6-й лабе для создания отчета без кода?", a: ["Макет оформления", "Конструктор форм", "СКД (Система компоновки данных)", "Модуль объекта"], c: 2 },
    { q: "Какую виртуальную таблицу мы выбрали в Конструкторе запроса?", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 },
    { q: "Зачем в настройках СКД нужны 'Детальные записи'?", a: ["Чтобы скрыть итоги", "Для вывода подробных строк (Склад, Товар)", "Для защиты отчета", "Это ошибка"], c: 1 },
    { q: "Что позволяет пользователю менять даты отчета в режиме '1С:Предприятие'?", a: ["Параметры в 'Пользовательских настройках'", "Длина кода справочника", "Имя подсистемы", "Кнопка СБРОС"], c: 0 }
];

const ANIMAL_NAMES = [
    "Мудрый Кот", "Быстрый Гепард", "Сонная Панда", "Грозный Тигр", "Хитрый Лис", 
    "Смелый Лев", "Тихий Волк", "Веселый Енот", "Гордый Орел", "Умный Сова",
    "Яркий Попугай", "Добрый Слон", "Ловкий Мангуст", "Крутой Бобер", "Синий Кит",
    "Золотой Олень", "Снежный Барс", "Дикий Кабан", "Вольный Конь", "Лесной Олень",
    "Черный Гриф", "Белый Медведь", "Рыжий Белка", "Стальной Зубр", "Быстрый Заяц",
    "Зоркий Сокол", "Могучий Лось", "Пятнистый Жираф", "Речной Выдра", "Горный Козел"
];

// Состояние игры
let state = {
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    timer: null
};

// --- ЛОГИКА ИГРОКА ---
const User = {
    async join() {
        SoundEngine.init();
        let inputNick = document.getElementById('p-nick').value.trim();
        
        // Автоматическое имя животного, если ник пустой или игра уже идет
        if (!inputNick) {
            inputNick = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
        }

        state.myNick = inputNick;
        localStorage.setItem('quiz_nick', state.myNick);

        const playerRef = db.ref('players/' + state.myNick);
        await playerRef.update({ score: 0, online: true });
        playerRef.onDisconnect().remove();

        SoundEngine.playTap();
        this.renderIdentity();
        document.getElementById('join-card').innerHTML = `<h2 style="color:#333">Вы в игре, ${state.myNick}!</h2>`;
    },

    renderIdentity() {
        let idTag = document.getElementById('player-id');
        if (!idTag) {
            idTag = document.createElement('div');
            idTag.id = 'player-id';
            idTag.className = 'player-identity';
            document.body.appendChild(idTag);
        }
        idTag.innerText = `Игрок: ${state.myNick}`;
    },

    hit(idx) {
        if (!state.canHit) return;
        state.canHit = false;
        SoundEngine.playTap();
        document.getElementById('ans-grid').style.opacity = "0.3";

        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timeLeft = parseInt(document.getElementById('timer-sec').innerText);
            let points = 500 + (timeLeft * 25);
            db.ref('players/' + state.myNick + '/score').transaction(s => (s || 0) + points);
            SoundEngine.playCorrect();
        } else {
            SoundEngine.playWrong();
        }
    }
};

// --- ЛОГИКА АДМИНА ---
const Admin = {
    login() {
        if (document.getElementById('pin').value === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
            SoundEngine.playStart();
        }
    },

    setStep(step) { db.ref('game').update({ step: step }); },

    async runAuto() {
        SoundEngine.playStart();
        for (let i = 0; i < QUIZ_DATA.length; i++) {
            await db.ref('game').update({ step: 'getready', qIdx: i });
            await new Promise(r => setTimeout(r, 3000));
            await db.ref('game').update({ step: 'game' });
            await new Promise(r => setTimeout(r, 20500));
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 5000));
        }
        this.setStep('podium');
    },

    reset() {
        db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
        localStorage.clear();
        location.reload();
    }
};

// --- СИНХРОНИЗАЦИЯ И РЕНДЕР ---
db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    state.currentQIdx = g.qIdx;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + g.step);
    if (target) target.classList.add('active');

    if (g.step === 'game') startQuestionFlow();
    if (g.step === 'podium') {
        SoundEngine.playFanfare();
        createConfetti();
    }
});

db.ref('players').on('value', snap => {
    const p = snap.val() || {};
    const sorted = Object.entries(p).sort((a, b) => b[1].score - a[1].score);
    
    // Лобби
    document.getElementById('player-tags').innerHTML = sorted.map(([n]) => `<div class="tag">${n}</div>`).join('');
    document.getElementById('online-counter').innerText = `${Object.keys(p).length} игроков онлайн`;

    // Рейтинги
    const listHtml = sorted.slice(0, 5).map(([n, d], i) => `
        <div class="winner-row ${i === 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${n}</span>
            <b>${d.score}</b>
        </div>
    `).join('');
    
    document.getElementById('round-leaderboard').innerHTML = listHtml;
    document.getElementById('podium-final').innerHTML = listHtml;
});

function startQuestionFlow() {
    state.canHit = true;
    document.getElementById('ans-grid').style.opacity = "1";
    const q = QUIZ_DATA[state.currentQIdx];
    document.getElementById('q-text').innerText = q.q;
    
    const btns = document.querySelectorAll('.ans-btn .t');
    q.a.forEach((t, i) => { if (btns[i]) btns[i].innerText = t; });

    let left = 20;
    document.getElementById('timer-sec').innerText = left;
    clearInterval(state.timer);
    state.timer = setInterval(() => {
        left--;
        document.getElementById('timer-sec').innerText = left;
        if (left <= 5) SoundEngine.playTick();
        if (left <= 0) {
            clearInterval(state.timer);
            state.canHit = false;
        }
    }, 1000);
}

// Эффект Конфетти (Чистый CSS/JS)
function createConfetti() {
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = ['#ff0','#f0f','#0ff','#0f0'][Math.floor(Math.random()*4)];
        c.style.transform = `scale(${Math.random()})`;
        document.body.appendChild(c);
        
        const anime = c.animate([
            { top: '-10%', transform: 'rotate(0deg)' },
            { top: '110%', transform: 'rotate(720deg)' }
        ], { duration: 2000 + Math.random() * 3000, iterations: Infinity });
    }
}

// Восстановление сессии при перезагрузке
if (state.myNick) User.renderIdentity();
