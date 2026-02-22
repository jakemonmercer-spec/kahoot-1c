// ==========================================
// 1. БАЗА ДАННЫХ ВОПРОСОВ (12 ШТУК)
// ==========================================

const QUIZ_DATA = [
    // --- Вопросы из Лабораторной №6 (7 шт) ---
    { 
        q: "Для чего предназначен объект конфигурации «Отчет»?", 
        a: ["Для хранения паролей", "Для анализа данных и вывода сводных таблиц", "Для ввода новых сотрудников", "Для удаления базы"], 
        c: 1 
    },
    { 
        q: "Как создать отчет с помощью конструктора без написания кода?", 
        a: ["Через Модуль объекта", "Использовать Макет", "Через СКД (Схему компоновки данных)", "Написать в блокноте"], 
        c: 2 
    },
    { 
        q: "Что такое виртуальная таблица «ОстаткиИОбороты»?", 
        a: ["Список всех картинок", "Таблица, считающая приход, расход и остатки", "Архив старых документов", "Таблица для чата"], 
        c: 1 
    },
    { 
        q: "Какие поля критически важны для отчета «Материалы»?", 
        a: ["Цвет и Размер", "Склад, Материал, Остатки и Обороты", "Имя директора и телефон", "Адрес магазина"], 
        c: 1 
    },
    { 
        q: "Для чего нужны параметры «Начало периода» и «Конец периода»?", 
        a: ["Для красоты", "Чтобы задать временной период для отчета", "Для регистрации пользователя", "Для ускорения программы"], 
        c: 1 
    },
    { 
        q: "Как сделать так, чтобы команда отчета появилась в меню программы?", 
        a: ["Создать ярлык", "Отметить нужные разделы на вкладке «Подсистемы»", "Написать в поддержку", "Просто сохранить файл"], 
        c: 1 
    },
    { 
        q: "Какую кнопку нужно нажать в 1С, чтобы отчет вывел данные на экран?", 
        a: ["«Сформировать»", "«Пуск»", "«Записать и закрыть»", "«Провести»"], 
        c: 0 
    },
    // --- Базовые вопросы про 1С:Предприятие (5 шт) ---
    { 
        q: "Как называется компания-разработчик системы «1С:Предприятие»?", 
        a: ["1С", "Microsoft", "Oracle", "SAP"], 
        c: 0 
    },
    { 
        q: "Какой основной фирменный цвет интерфейса и логотипа 1С?", 
        a: ["Синий", "Желтый", "Зеленый", "Черный"], 
        c: 1 
    },
    { 
        q: "В каком режиме программист пишет код и создает структуру базы?", 
        a: ["Пользовательский режим", "Конфигуратор", "Режим отладки", "Браузер"], 
        c: 1 
    },
    { 
        q: "Какой объект в 1С используется для хранения списков (например, товаров)?", 
        a: ["Справочник", "Документ", "Отчет", "Константа"], 
        c: 0 
    },
    { 
        q: "Какой объект в 1С фиксирует событие хозяйственной жизни (например, продажу)?", 
        a: ["Регистр", "Документ", "Макет", "План счетов"], 
        c: 1 
    }
];

// ==========================================
// 2. ИМЕНА-ЗАГЛУШКИ ДЛЯ ОПОЗДАВШИХ
// ==========================================

const ANIMAL_NAMES = [
    "Мудрый Кот", "Быстрый Гепард", "Сонная Панда", "Грозный Тигр", "Хитрый Лис", 
    "Смелый Лев", "Тихий Волк", "Веселый Енот", "Гордый Орел", "Умный Сова",
    "Яркий Попугай", "Добрый Слон", "Ловкий Мангуст", "Крутой Бобер", "Синий Кит",
    "Золотой Олень", "Снежный Барс", "Дикий Кабан", "Вольный Конь", "Лесной Олень",
    "Черный Гриф", "Белый Медведь", "Рыжая Белка", "Стальной Зубр", "Быстрый Заяц",
    "Зоркий Сокол", "Могучий Лось", "Пятнистый Жираф", "Речная Выдра", "Горный Козел"
];

// Глобальное состояние игры на устройстве
let state = {
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    syncTimer: null,
    serverOffset: 0
};

// Вычисляем смещение времени с серверами Google для устранения ошибки NaN
db.ref('.info/serverTimeOffset').on('value', snap => {
    state.serverOffset = snap.val() || 0;
});

// ==========================================
// 3. ЛОГИКА ИГРОКА (USER)
// ==========================================

const User = {
    async join() {
        // Инициализация звука после первого взаимодействия с экраном
        if (typeof SoundEngine !== 'undefined') SoundEngine.init();
        
        let inputField = document.getElementById('p-nick');
        let nameToUse = inputField ? inputField.value.trim() : "";
        
        // Автогенерация имени, если пусто или игрок зашел в середине игры
        if (!nameToUse) {
            const randomAnimal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
            nameToUse = randomAnimal + " #" + Math.floor(Math.random() * 1000); // Добавили ID для уникальности
        }
        
        // Защита от системных ошибок
        if (nameToUse === "undefined") nameToUse = "Студент #" + Math.floor(Math.random() * 1000);

        state.myNick = nameToUse;
        localStorage.setItem('quiz_nick', state.myNick);

        // Гарантированно создаем запись игрока со счетом 0 и пустым выбором
        const playerRef = db.ref('players/' + state.myNick);
        await playerRef.set({ 
            score: 0, 
            lastChoice: -1,
            lastActive: firebase.database.ServerValue.TIMESTAMP 
        });

        // Контроль активности: удаляем при закрытии страницы
        playerRef.onDisconnect().remove();

        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        this.renderIdentity();
        
        const joinCard = document.getElementById('join-card');
        if (joinCard) {
            joinCard.innerHTML = `<h2 style="color:#333; font-weight:900;">ВЫ В ИГРЕ!<br><small style="color:#46178f">${state.myNick}</small></h2>`;
        }
    },

    renderIdentity() {
        if (!state.myNick || state.myNick === "undefined") return;
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
        if (!state.canHit || !state.myNick || state.myNick === "undefined") return;
        state.canHit = false;
        
        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        
        // Визуально блокируем кнопки
        const grid = document.getElementById('ans-grid');
        if (grid) grid.style.opacity = "0.3";

        // Мгновенная запись выбора для статистики (графики)
        db.ref('players/' + state.myNick + '/lastChoice').set(idx);

        // Логика проверки правильности
        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timerEl = document.getElementById('timer-sec');
            let timeLeft = timerEl ? parseInt(timerEl.innerText) : 0;
            if (isNaN(timeLeft)) timeLeft = 0; // Защита от NaN

            // Начисление баллов: База 500 + Бонус за скорость
            let points = 500 + (timeLeft * 25);
            db.ref('players/' + state.myNick + '/score').transaction(s => (s || 0) + points);
            if (typeof SoundEngine !== 'undefined') SoundEngine.playCorrect();
        } else {
            if (typeof SoundEngine !== 'undefined') SoundEngine.playWrong();
        }
    }
};

// ==========================================
// 4. ЛОГИКА АДМИНА И АВТОПИЛОТ (ADMIN)
// ==========================================

const Admin = {
    login() {
        const pinInput = document.getElementById('pin');
        if (pinInput && pinInput.value === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
        } else {
            alert("Неверный PIN!");
        }
    },

    setStep(step) { db.ref('game').update({ step: step }); },

    async runAuto() {
        if (!confirm("ЗАПУСТИТЬ ИГРУ? (Автоматический цикл 12 вопросов)")) return;
        
        // Чистим возможные ошибки базы перед стартом
        await db.ref('players/undefined').remove();

        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // Обнуляем выборы у ВСЕХ игроков (чтобы графики строились заново)
            const playersSnap = await db.ref('players').once('value');
            const updates = {};
            playersSnap.forEach(child => { updates[`players/${child.key}/lastChoice`] = -1; });
            await db.ref().update(updates);

            // ЭТАП 1: Приготовьтесь (4 секунды)
            await db.ref('game').set({ 
                step: 'getready', 
                qIdx: i, 
                serverStartTime: firebase.database.ServerValue.TIMESTAMP 
            });
            await new Promise(r => setTimeout(r, 4000));

            // ЭТАП 2: Вопрос (21 секунда)
            await db.ref('game').update({ 
                step: 'game',
                serverStartTime: firebase.database.ServerValue.TIMESTAMP 
            });
            await new Promise(r => setTimeout(r, 21000));

            // ЭТАП 3: Статистика и результаты (6.5 секунд)
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 6500));
        }
        
        // ФИНАЛ
        db.ref('game').update({ step: 'podium' });
    },

    reset() {
        if (confirm("ВНИМАНИЕ! Полный сброс базы данных. Удалить всех игроков и очки?")) {
            db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
            localStorage.clear();
            location.reload();
        }
    }
};

// ==========================================
// 5. ИДЕАЛЬНЫЙ СИНХРОННЫЙ ТАЙМЕР
// ==========================================

function startSyncTimer(serverStartTime) {
    clearInterval(state.syncTimer);
    if (!serverStartTime) return;

    state.syncTimer = setInterval(() => {
        // Учитываем разницу во времени между телефоном и сервером
        const nowServer = Date.now() + state.serverOffset;
        const elapsed = Math.floor((nowServer - serverStartTime) / 1000);
        let left = 20 - elapsed;
        
        if (left < 0) left = 0;
        
        const el = document.getElementById('timer-sec');
        if (el) {
            // Если расчет не удался, показываем 20, а не NaN
            el.innerText = isNaN(left) ? "20" : left;
            
            // Звук тиканья на последних 5 секундах
            if (left <= 5 && left > 0 && typeof SoundEngine !== 'undefined') SoundEngine.playTick();
            
            // Время вышло
            if (left === 0) {
                state.canHit = false;
                const grid = document.getElementById('ans-grid');
                if (grid) grid.style.opacity = "0.3";
                clearInterval(state.syncTimer);
            }
        }
    }, 1000);
}

// ==========================================
// 6. СЛУШАТЕЛИ FIREBASE (REALTIME РЕНДЕР)
// ==========================================

// А. Состояние игры (Экраны и Вопросы)
db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    state.currentQIdx = g.qIdx;

    // Авто-вход для опоздавших
    if (!state.myNick && g.step !== 'lobby' && g.step !== 'wait') {
        User.join(); 
    }

    // Переключение экранов
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetView = document.getElementById('view-' + g.step);
    if (targetView) targetView.classList.add('active');

    // Отрисовка вопроса
    if (g.step === 'game') {
        state.canHit = true;
        const grid = document.getElementById('ans-grid');
        if (grid) grid.style.opacity = "1";
        
        const q = QUIZ_DATA[state.currentQIdx];
        if (q) {
            document.getElementById('q-text').innerText = q.q;
            const btnTexts = document.querySelectorAll('.ans-btn .t');
            q.a.forEach((text, i) => { if (btnTexts[i]) btnTexts[i].innerText = text; });
        }
        // Запускаем таймер
        startSyncTimer(g.serverStartTime);
    }
    
    // Финал
    if (g.step === 'podium') {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playFanfare();
        createConfetti();
    }
});

// Б. Список игроков (Рейтинг, Лобби, Статистика)
db.ref('players').on('value', snap => {
    const pData = snap.val() || {};
    
    // Удаляем мусорные записи
    if (pData.undefined) db.ref('players/undefined').remove();

    // Фильтруем и получаем ВСЕХ игроков (даже с 0 баллов)
    const allPlayers = Object.entries(pData).filter(([name]) => name !== "undefined" && name !== "");
    
    // Сортировка по баллами (от большего к меньшему)
    const sortedPlayers = [...allPlayers].sort((a, b) => b[1].score - a[1].score);
    
    // 1. Отрисовка Лобби (Все игроки)
    const lobby = document.getElementById('player-tags');
    if (lobby) {
        lobby.innerHTML = allPlayers.map(([n]) => `<div class="tag">${n}</div>`).join('');
    }
    
    const counter = document.getElementById('online-counter');
    if (counter) counter.innerText = `Подключено: ${allPlayers.length} студентов`;

    // 2. Расчет графиков статистики (Кто что нажал)
    let stats = [0, 0, 0, 0];
    allPlayers.forEach(([_, data]) => {
        if (data.lastChoice !== undefined && data.lastChoice >= 0) {
            stats[data.lastChoice]++;
        }
    });

    // Рисуем столбики
    stats.forEach((count, i) => {
        const bar = document.getElementById(`bar-${i}`);
        const countTxt = document.getElementById(`count-${i}`);
        if (bar) bar.style.height = (count * 20 + 5) + "px"; // 20px за каждый голос
        if (countTxt) countTxt.innerText = count;
    });

    // 3. Отрисовка Рейтинга (Все участники)
    let fullRankHtml = sortedPlayers.map(([n, d], i) => `
        <div class="podium-row ${i === 0 && d.score > 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${n}</span>
            <b>${d.score}</b>
        </div>
    `).join('');

    if (allPlayers.length === 0) {
        fullRankHtml = "<div class='tag'>Ждем игроков...</div>";
    }

    const roundLeaderboard = document.getElementById('round-leaderboard');
    if (roundLeaderboard) roundLeaderboard.innerHTML = fullRankHtml;
    
    const podiumFinal = document.getElementById('podium-final');
    if (podiumFinal) podiumFinal.innerHTML = fullRankHtml;

    // 4. Счетчик ответов на экране вопроса
    const ansCountDisplay = document.getElementById('ans-count');
    const answersReceived = allPlayers.filter(([_, d]) => d.lastChoice !== undefined && d.lastChoice >= 0).length;
    if (ansCountDisplay) ansCountDisplay.innerText = answersReceived;
});

// ==========================================
// 7. ДОПОЛНИТЕЛЬНЫЕ ЭФФЕКТЫ И МОДАЛКА
// ==========================================

function createConfetti() {
    for (let i = 0; i < 100; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = ['#ff3366','#2de2e2','#f8e71c','#7ed321','#ffffff'][Math.floor(Math.random()*5)];
        c.style.width = Math.random() * 12 + 6 + 'px';
        c.style.height = c.style.width;
        document.body.appendChild(c);
        
        c.animate([
            { top: '-10%', transform: 'rotate(0deg)' },
            { top: '110%', transform: 'rotate(' + (Math.random() * 720 + 360) + 'deg)' }
        ], { 
            duration: 2500 + Math.random() * 3000, 
            iterations: Infinity 
        });
    }
}

function showDonation() {
    const modal = document.getElementById('bread-modal');
    if (modal) modal.style.display = 'flex';
}

// Восстановление имени при случайной перезагрузке
if (state.myNick && state.myNick !== "undefined") {
    User.renderIdentity();
}

// Экспорт для доступа из HTML
window.User = User; 
window.Admin = Admin;
