// ==========================================
// 1. КОНСТАНТЫ: 12 ВОПРОСОВ (7 Лаба + 5 База)
// ==========================================

const QUIZ_DATA = [
    { q: "Для чего предназначен объект конфигурации «Отчет»?", a: ["Для хранения паролей", "Для анализа данных информационной базы", "Для ввода новых сотрудников", "Для удаления базы"], c: 1 },
    { q: "Как создать отчет с помощью конструктора (СКД)?", a: ["Через Модуль объекта", "Использовать Макет", "Добавить объект 'Отчет' и открыть схему компоновки", "Написать в блокноте"], c: 2 },
    { q: "Что такое виртуальная таблица «ОстаткиИОбороты»?", a: ["Список всех картинок", "Таблица, рассчитывающая начальные остатки, приход и расход", "Архив старых документов", "Таблица для чата"], c: 1 },
    { q: "Какие поля нужно выбрать для отчета «Материалы»?", a: ["Цвет и Размер", "Склад, Материал, Остатки и Обороты", "Имя директора", "Адрес магазина"], c: 1 },
    { q: "Для чего нужны параметры «Начало периода» и «Конец периода»?", a: ["Для красоты", "Чтобы задать временной интервал формирования отчета", "Для регистрации", "Для ускорения интернета"], c: 1 },
    { q: "Как отобразить отчет в разделах (Бухгалтерия, Учет материалов)?", a: ["Создать ярлык", "Отметить нужные разделы на вкладке «Подсистемы»", "Написать код", "Просто сохранить"], c: 1 },
    { q: "Как проверить работу отчета в режиме 1С:Предприятие?", a: ["Нажать «Сформировать»", "Нажать «Пуск»", "Зайти в Справочники", "Удалить документ"], c: 0 },
    { q: "Как называется режим, в котором программист создает структуру базы?", a: ["Пользовательский", "Конфигуратор", "1С:Предприятие", "Браузер"], c: 1 },
    { q: "Основной фирменный цвет интерфейса 1С?", a: ["Синий", "Желтый", "Зеленый", "Черный"], c: 1 },
    { q: "Как называется компания-разработчик системы?", a: ["1С", "Microsoft", "Google", "Apple"], c: 0 },
    { q: "В каком объекте 1С хранятся списки (товары, клиенты)?", a: ["Справочники", "Документы", "Регистры", "Отчеты"], c: 0 },
    { q: "Какой объект фиксирует событие (например, факт продажи)?", a: ["Регистр", "Документ", "Макет", "Стиль"], c: 1 }
];

// Список 30 животных для автоматического входа
const ANIMAL_NAMES = [
    "Мудрый Кот", "Быстрый Гепард", "Сонная Панда", "Грозный Тигр", "Хитрый Лис", 
    "Смелый Лев", "Тихий Волк", "Веселый Енот", "Гордый Орел", "Умный Сова",
    "Яркий Попугай", "Добрый Слон", "Ловкий Мангуст", "Крутой Бобер", "Синий Кит",
    "Золотой Олень", "Снежный Барс", "Дикий Кабан", "Вольный Конь", "Лесной Олень",
    "Черный Гриф", "Белый Медведь", "Рыжая Белка", "Стальной Зубр", "Быстрый Заяц",
    "Зоркий Сокол", "Могучий Лось", "Пятнистый Жираф", "Речная Выдра", "Горный Козел"
];

let state = {
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    syncTimer: null,
    serverOffset: 0
};

// Синхронизация времени с серверами Google
db.ref('.info/serverTimeOffset').on('value', snap => {
    state.serverOffset = snap.val() || 0;
});

// ==========================================
// 2. ЛОГИКА ИГРОКА (USER)
// ==========================================

const User = {
    // Принудительный вход (срабатывает сразу при загрузке страницы)
    async autoJoin() {
        if (typeof SoundEngine !== 'undefined') SoundEngine.init();
        
        // Если ника нет — даем животное
        if (!state.myNick) {
            const randomAnimal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
            state.myNick = randomAnimal + " #" + Math.floor(Math.random() * 100);
            localStorage.setItem('quiz_nick', state.myNick);
        }

        const playerRef = db.ref('players/' + state.myNick);
        
        // Регистрируем в базе (score 0, выбор -1)
        await playerRef.update({ 
            score: 0, 
            lastChoice: -1,
            lastActive: firebase.database.ServerValue.TIMESTAMP 
        });

        // Удаление из базы при закрытии вкладки
        playerRef.onDisconnect().remove();

        this.renderIdentity();
        console.log("Logged in as: " + state.myNick);
    },

    // Ручное изменение имени
    async manualJoin() {
        const newNick = document.getElementById('p-nick').value.trim();
        if (!newNick) return alert("Введите имя!");
        
        // Удаляем старого "зверя" из базы
        if (state.myNick) db.ref('players/' + state.myNick).remove();
        
        state.myNick = newNick;
        localStorage.setItem('quiz_nick', state.myNick);
        this.autoJoin(); // Перезаходим под новым именем
    },

    renderIdentity() {
        let idTag = document.getElementById('player-identity-tag');
        if (!idTag) {
            idTag = document.createElement('div');
            idTag.id = 'player-identity-tag';
            idTag.className = 'player-identity';
            document.body.appendChild(idTag);
        }
        idTag.innerText = `👤 ${state.myNick}`;
    },

    hit(idx) {
        if (!state.canHit || !state.myNick) return;
        state.canHit = false;
        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        document.getElementById('ans-grid').style.opacity = "0.3";

        // Сохраняем выбор в базу для статистики графиков
        db.ref('players/' + state.myNick + '/lastChoice').set(idx);

        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timerEl = document.getElementById('timer-sec');
            let timeLeft = timerEl ? parseInt(timerEl.innerText) : 0;
            let points = 500 + (isNaN(timeLeft) ? 0 : timeLeft * 25);
            db.ref('players/' + state.myNick + '/score').transaction(s => (s || 0) + points);
            if (typeof SoundEngine !== 'undefined') SoundEngine.playCorrect();
        } else {
            if (typeof SoundEngine !== 'undefined') SoundEngine.playWrong();
        }
    }
};

// ==========================================
// 3. ЛОГИКА АДМИНИСТРАТОРА (ADMIN)
// ==========================================

const Admin = {
    login() {
        if (document.getElementById('pin').value === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
        }
    },

    setStep(step) { db.ref('game').update({ step: step }); },

    async runAuto() {
        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // Сброс выбора у всех перед вопросом
            const playersSnap = await db.ref('players').once('value');
            const updates = {};
            playersSnap.forEach(child => { updates[`players/${child.key}/lastChoice`] = -1; });
            await db.ref().update(updates);

            await db.ref('game').set({ step: 'getready', qIdx: i, serverStartTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 4000));

            await db.ref('game').update({ step: 'game', serverStartTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 21000));

            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 6500));
        }
        db.ref('game').update({ step: 'podium' });
    },

    async reset() {
        if (confirm("Сбросить систему и очистить память у всех?")) {
            await db.ref('game/step').set('reset-all');
            setTimeout(() => {
                db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
                localStorage.clear();
                location.reload();
            }, 500);
        }
    }
};

// ==========================================
// 4. СИНХРОНИЗАЦИЯ ТАЙМЕРА (БЕЗ NaN)
// ==========================================

function startSyncTimer(startTime) {
    clearInterval(state.syncTimer);
    if (!startTime) return;
    state.syncTimer = setInterval(() => {
        const nowServer = Date.now() + state.serverOffset;
        const elapsed = Math.floor((nowServer - startTime) / 1000);
        let left = 20 - elapsed;
        if (left < 0) left = 0;
        const el = document.getElementById('timer-sec');
        if (el) {
            el.innerText = isNaN(left) ? "20" : left;
            if (left <= 5 && left > 0 && typeof SoundEngine !== 'undefined') SoundEngine.playTick();
            if (left === 0) { state.canHit = false; document.getElementById('ans-grid').style.opacity = "0.3"; clearInterval(state.syncTimer); }
        }
    }, 1000);
}

// ==========================================
// 5. ГЛАВНЫЕ СЛУШАТЕЛИ FIREBASE
// ==========================================

db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    
    // Сигнал глобального сброса
    if (g.step === 'reset-all') {
        localStorage.clear();
        location.reload();
        return;
    }

    state.currentQIdx = g.qIdx;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + g.step);
    if (target) target.classList.add('active');

    if (g.step === 'game') {
        state.canHit = true;
        document.getElementById('ans-grid').style.opacity = "1";
        const q = QUIZ_DATA[state.currentQIdx];
        if (q) {
            document.getElementById('q-text').innerText = q.q;
            const btnTs = document.querySelectorAll('.ans-btn .t');
            q.a.forEach((t, i) => { if (btnTs[i]) btnTs[i].innerText = t; });
        }
        startSyncTimer(g.serverStartTime);
    }
    if (g.step === 'podium') {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playFanfare();
        createConfetti();
    }
});

// Слушатель игроков (LABEL + РЕЙТИНГ + СТАТИСТИКА)
db.ref('players').on('value', snap => {
    const pData = snap.val() || {};
    const allPlayers = Object.entries(pData).filter(([n]) => n !== "undefined");
    const sorted = [...allPlayers].sort((a, b) => b[1].score - a[1].score);
    
    // 1. ОБНОВЛЕНИЕ LABEL (ВЕРХНЯЯ ПАНЕЛЬ)
    const labelCount = document.getElementById('label-count');
    const labelNames = document.getElementById('label-names-list');
    if (labelCount) labelCount.innerText = allPlayers.length;
    if (labelNames) {
        labelNames.innerText = allPlayers.slice(0, 10).map(([n]) => n).join(', ') + (allPlayers.length > 10 ? '...' : '');
    }

    // 2. ОБНОВЛЕНИЕ ЛОББИ
    const lobby = document.getElementById('player-tags');
    if (lobby) lobby.innerHTML = allPlayers.map(([n]) => `<div class="tag">${n}</div>`).join('');

    // 3. СТАТИСТИКА (ГРАФИКИ)
    let stats = [0, 0, 0, 0];
    allPlayers.forEach(([_, d]) => { if (d.lastChoice >= 0) stats[d.lastChoice]++; });
    stats.forEach((count, i) => {
        const bar = document.getElementById(`bar-${i}`);
        const countTxt = document.getElementById(`count-${i}`);
        if (bar) bar.style.height = (count * 20 + 5) + "px"; 
        if (countTxt) countTxt.innerText = count;
    });

    // 4. РЕЙТИНГ (ВСЕ ИГРОКИ)
    const podiumHtml = sorted.map(([n, d], i) => `
        <div class="podium-row ${i === 0 && d.score > 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${n}</span>
            <b>${d.score}</b>
        </div>
    `).join('') || "<div class='tag'>Ждем игроков...</div>";

    const roundBox = document.getElementById('round-leaderboard');
    if (roundBox) roundBox.innerHTML = podiumHtml;
    const finalBox = document.getElementById('podium-final');
    if (finalBox) finalBox.innerHTML = podiumHtml;

    // 5. СЧЕТЧИК ОТВЕТОВ
    const ansCount = document.getElementById('ans-count');
    const actualAns = allPlayers.filter(([_, d]) => d.lastChoice >= 0).length;
    if (ansCount) ansCount.innerText = actualAns;
});

// ==========================================
// 6. ДОПОЛНИТЕЛЬНЫЕ ЭФФЕКТЫ
// ==========================================

function createConfetti() {
    for (let i = 0; i < 80; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = ['#ff3366','#2de2e2','#f8e71c','#7ed321','#ffffff'][Math.floor(Math.random()*5)];
        document.body.appendChild(c);
        c.animate([{ top: '-10%', transform: 'rotate(0deg)' }, { top: '110%', transform: 'rotate(720deg)' }], { duration: 2500 + Math.random() * 2000, iterations: Infinity });
    }
}

function showDonation() {
    const modal = document.getElementById('bread-modal');
    if(modal) modal.style.display = 'flex';
}

// ЗАПУСК АВТО-ВХОДА ПРИ ОТКРЫТИИ СТРАНИЦЫ
User.autoJoin();

window.User = User; window.Admin = Admin;
