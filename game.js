// 1. ДАННЫЕ ВОПРОСОВ (Лабораторная №6)
const QUIZ_DATA = [
    { q: "Для чего предназначен объект 'Отчет' в 1С?", a: ["Для ввода данных", "Для анализа и вывода сводной информации", "Для хранения списка сотрудников", "Для удаления записей"], c: 1 },
    { q: "Какой инструмент используется в 6-й лабе для создания отчета без кода?", a: ["Макет оформления", "Конструктор форм", "СКД (Система компоновки данных) ", "Модуль объекта"], c: 2 },
    { q: "Какую виртуальную таблицу мы выбрали в Конструкторе запроса?", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 },
    { q: "Зачем в настройках СКД нужны 'Детальные записи'?", a: ["Чтобы скрыть итоги", "Для вывода подробных строк (Склад, Товар)", "Для защиты отчета", "Это ошибка"], c: 1 },
    { q: "Что позволяет пользователю менять даты отчета в режиме '1С:Предприятие'?", a: ["Параметры в 'Пользовательских настройках'", "Длина кода справочника", "Имя подсистемы", "Кнопка СБРОС"], c: 0 }
];

// 30 ЖИВОТНЫХ ДЛЯ АВТО-ИМЕН
const ANIMAL_NAMES = [
    "Мудрый Кот", "Быстрый Гепард", "Сонная Панда", "Грозный Тигр", "Хитрый Лис", 
    "Смелый Лев", "Тихий Волк", "Веселый Енот", "Гордый Орел", "Умный Сова",
    "Яркий Попугай", "Добрый Слон", "Ловкий Мангуст", "Крутой Бобер", "Синий Кит",
    "Золотой Олень", "Снежный Барс", "Дикий Кабан", "Вольный Конь", "Лесной Олень",
    "Черный Гриф", "Белый Медведь", "Рыжий Белка", "Стальной Зубр", "Быстрый Заяц",
    "Зоркий Сокол", "Могучий Лось", "Пятнистый Жираф", "Речной Выдра", "Горный Козел"
];

let state = {
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    syncTimer: null,
    serverOffset: 0
};

// Разница во времени с Google
db.ref('.info/serverTimeOffset').on('value', snap => { state.serverOffset = snap.val() || 0; });

// --- ЛОГИКА ИГРОКА ---
const User = {
    async join(manualNick = "") {
        SoundEngine.init();
        let nameToUse = manualNick || document.getElementById('p-nick')?.value.trim();
        
        // Если имя не введено - берем случайное животное
        if (!nameToUse) {
            nameToUse = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)] + " " + Math.floor(Math.random()*99);
        }
        
        state.myNick = nameToUse;
        localStorage.setItem('quiz_nick', state.myNick);

        const playerRef = db.ref('players/' + state.myNick);
        await playerRef.update({ score: 0, lastActive: firebase.database.ServerValue.TIMESTAMP });
        playerRef.onDisconnect().remove();

        SoundEngine.playTap();
        this.renderIdentity();
        
        const card = document.getElementById('join-card');
        if(card) card.innerHTML = `<h2 style="color:#333">Вы в игре: ${state.myNick}</h2>`;
    },

    renderIdentity() {
        if (!state.myNick || state.myNick === "undefined") return;
        let idTag = document.getElementById('player-id') || document.createElement('div');
        idTag.id = 'player-id';
        idTag.className = 'player-identity';
        idTag.innerText = `Игрок: ${state.myNick}`;
        if (!document.getElementById('player-id')) document.body.appendChild(idTag);
    },

    hit(idx) {
        if (!state.canHit || !state.myNick || state.myNick === "undefined") return;
        state.canHit = false;
        SoundEngine.playTap();
        document.getElementById('ans-grid').style.opacity = "0.3";

        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let t = parseInt(document.getElementById('timer-sec').innerText) || 0;
            let points = 500 + (t * 25);
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
        }
    },

    async runAuto() {
        await db.ref('players/undefined').remove();
        for (let i = 0; i < QUIZ_DATA.length; i++) {
            await db.ref('game').set({ step: 'getready', qIdx: i, serverStartTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 4000));
            await db.ref('game').update({ step: 'game', serverStartTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 21000));
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 6000));
        }
        db.ref('game').update({ step: 'podium' });
    },

    reset() {
        if (confirm("Сбросить систему?")) {
            db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
            localStorage.clear();
            location.reload();
        }
    }
};

// --- СИНХРОНИЗАЦИЯ ТАЙМЕРА ---
function startSyncTimer(startTime) {
    clearInterval(state.syncTimer);
    if (!startTime) return;

    state.syncTimer = setInterval(() => {
        const elapsed = Math.floor(((Date.now() + state.serverOffset) - startTime) / 1000);
        let left = 20 - elapsed;
        if (left < 0) left = 0;
        
        const el = document.getElementById('timer-sec');
        if (el) {
            el.innerText = left;
            if (left <= 5 && left > 0) SoundEngine.playTick();
            if (left === 0) { state.canHit = false; document.getElementById('ans-grid').style.opacity = "0.3"; clearInterval(state.syncTimer); }
        }
    }, 1000);
}

// --- ГЛАВНЫЙ СЛУШАТЕЛЬ ---
db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    state.currentQIdx = g.qIdx;

    // АВТО-ВХОД ДЛЯ ОПОЗДАВШИХ
    if (!state.myNick && g.step !== 'lobby') {
        User.join(); // Автоматически заходим под именем животного
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + g.step);
    if (target) target.classList.add('active');

    if (g.step === 'game') {
        state.canHit = true;
        document.getElementById('ans-grid').style.opacity = "1";
        const q = QUIZ_DATA[state.currentQIdx];
        if (q) {
            document.getElementById('q-text').innerText = q.q;
            const b = document.querySelectorAll('.ans-btn .t');
            q.a.forEach((t, i) => { if (b[i]) b[i].innerText = t; });
        }
        startSyncTimer(g.serverStartTime);
    }
    if (g.step === 'podium') { SoundEngine.playFanfare(); createConfetti(); }
});

// ОБНОВЛЕНИЕ РЕЙТИНГА (Всегда показывает ТОП-5, даже с 0 баллов)
db.ref('players').on('value', snap => {
    const p = snap.val() || {};
    if (p.undefined) db.ref('players/undefined').remove();

    const sorted = Object.entries(p)
        .filter(([name]) => name !== "undefined")
        .sort((a, b) => b[1].score - a[1].score);
    
    const lobby = document.getElementById('player-tags');
    if (lobby) lobby.innerHTML = sorted.map(([n]) => `<div class="tag">${n}</div>`).join('');
    
    const online = document.getElementById('online-counter');
    if (online) online.innerText = `${sorted.length} игроков онлайн`;

    const podiumHtml = sorted.slice(0, 5).map(([n, d], i) => `
        <div class="podium-row ${i === 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${n}</span>
            <b>${d.score}</b>
        </div>
    `).join('');
    
    // Если игроков нет, выводим заглушку, чтобы экран не был пустым
    const finalHtml = podiumHtml || "<div class='tag'>Ждем ответов...</div>";
    
    document.getElementById('round-leaderboard').innerHTML = finalHtml;
    document.getElementById('podium-final').innerHTML = finalHtml;
    
    const ansCount = document.getElementById('ans-count');
    if (ansCount) ansCount.innerText = sorted.length;
});

function createConfetti() {
    for (let i = 0; i < 60; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = ['#ff3366','#2de2e2','#f8e71c','#7ed321'][Math.floor(Math.random()*4)];
        document.body.appendChild(c);
        c.animate([{ top: '-10%', transform: 'rotate(0deg)' }, { top: '110%', transform: 'rotate(720deg)' }], { duration: 2500 + Math.random() * 2000, iterations: Infinity });
    }
}

if (state.myNick && state.myNick !== "undefined") User.renderIdentity();
