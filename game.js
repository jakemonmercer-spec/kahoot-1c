// ==========================================
// 1. ДАННЫЕ И КОНСТАНТЫ (Лабораторная №6)
// ==========================================

const QUIZ_DATA = [
    // --- Контрольные вопросы по Лабе №6 ---
    { 
        q: "Для чего предназначен объект 'Отчет'?", 
        a: ["Для удаления данных", "Для анализа и сводных таблиц", "Для смены обоев в 1С", "Для выхода в интернет"], 
        c: 1 
    },
    { 
        q: "Как создать отчет быстрее всего?", 
        a: ["Нарисовать в Paint", "С помощью СКД", "Написать письмо в 1С", "Попросить соседа"], 
        c: 1 
    },
    { 
        q: "Что показывает таблица 'ОстаткиИОбороты'?", 
        a: ["Цены конкурентов", "Приход, расход и остатки", "Прогноз погоды", "Список игр"], 
        c: 1 
    },
    { 
        q: "Какие поля нужны для отчета 'Материалы'?", 
        a: ["Склад, Материал, Количество", "Цвет, Вес, Рост", "Город, Улица, Дом", "Модель и Марка"], 
        c: 0 
    },
    { 
        q: "Зачем нужны 'Начало' и 'Конец' периода?", 
        a: ["Для красоты", "Чтобы выбрать даты отчета", "Это техническая ошибка", "Чтобы выключить компьютер"], 
        c: 1 
    },
    { 
        q: "Как вывести отчет в меню программы?", 
        a: ["Спрятать его", "Отметить в 'Подсистемах'", "Удалить отчет", "Переименовать компьютер"], 
        c: 1 
    },
    { 
        q: "Кнопка для запуска отчета в режиме Предприятие?", 
        a: ["Удалить", "Сформировать", "Сломать", "Закрыть"], 
        c: 1 
    },
    // --- Банальные вопросы про 1С ---
    { 
        q: "Как называется режим разработчика в 1С?", 
        a: ["Мастер", "Конфигуратор", "Дизайнер", "Взломщик"], 
        c: 1 
    },
    { 
        q: "В каком объекте хранится список товаров?", 
        a: ["Справочник", "Документ", "Тетрадь", "Коробка"], 
        c: 0 
    },
    { 
        q: "Чем фиксируется продажа товара в 1С?", 
        a: ["Рисунком", "Документом", "Слухами", "Письмом"], 
        c: 1 
    },
    { 
        q: "Что такое 1С:Предприятие?", 
        a: ["Игра про ферму", "Система автоматизации бизнеса", "Браузер", "Музыкальный плеер"], 
        c: 1 
    },
    { 
        q: "На каком языке пишут код в 1С?", 
        a: ["Только английский", "Язык 1С (русский/английский)", "Латынь", "Шрифт Брайля"], 
        c: 1 
    }
];

// Список 30 животных для автоматического присвоения имен опоздавшим
const ANIMAL_NAMES = [
    "Мудрый Кот", "Быстрый Гепард", "Сонная Панда", "Грозный Тигр", "Хитрый Лис", 
    "Смелый Лев", "Тихий Волк", "Веселый Енот", "Гордый Орел", "Умный Сова",
    "Яркий Попугай", "Добрый Слон", "Ловкий Мангуст", "Крутой Бобер", "Синий Кит",
    "Золотой Олень", "Снежный Барс", "Дикий Кабан", "Вольный Конь", "Лесной Олень",
    "Черный Гриф", "Белый Медведь", "Рыжий Белка", "Стальной Зубр", "Быстрый Заяц",
    "Зоркий Сокол", "Могучий Лось", "Пятнистый Жираф", "Речной Выдра", "Горный Козел"
];

// Глобальное состояние системы
let state = {
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    syncTimer: null,
    serverOffset: 0
};

// Синхронизация времени с серверами Google для устранения NaN
db.ref('.info/serverTimeOffset').on('value', snap => {
    state.serverOffset = snap.val() || 0;
});

// ==========================================
// 2. ЛОГИКА ИГРОКА
// ==========================================

const User = {
    async join() {
        if (typeof SoundEngine !== 'undefined') SoundEngine.init();
        
        // Автоматическая генерация имени без участия пользователя
        const randomAnimal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
        const nameToUse = randomAnimal + " " + (Math.floor(Math.random() * 899) + 100);

        state.myNick = nameToUse;
        localStorage.setItem('quiz_nick', state.myNick);

        const playerRef = db.ref('players/' + state.myNick);
        await playerRef.set({ 
            score: 0, 
            lastChoice: -1,
            lastActive: firebase.database.ServerValue.TIMESTAMP 
        });

        playerRef.onDisconnect().remove();

        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        this.renderIdentity();
        
        const joinCard = document.getElementById('join-card');
        if (joinCard) {
            joinCard.innerHTML = `
                <div class="pulse">
                    <h2 style="color:#26890c; font-weight:900;">ВЫ В ИГРЕ!</h2>
                    <p style="color:#333; font-weight:800;">Ваш позывной:<br><span style="color:#46178f; font-size:1.4rem;">${state.myNick}</span></p>
                </div>`;
        }
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
        // Если ника нет или клик запрещен - ничего не делаем
        if (!state.canHit || !state.myNick || state.myNick === "undefined") return;
        state.canHit = false;
        
        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        document.getElementById('ans-grid').style.opacity = "0.3";

        // Сохраняем выбор в базу для статистики графиков
        db.ref('players/' + state.myNick + '/lastChoice').set(idx);

        // Проверка правильности
        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timerEl = document.getElementById('timer-sec');
            let timeLeft = timerEl ? parseInt(timerEl.innerText) : 0;
            if (isNaN(timeLeft)) timeLeft = 0;

            // Расчет баллов (база + время)
            let points = 500 + (timeLeft * 25);
            db.ref('players/' + state.myNick + '/score').transaction(s => (s || 0) + points);
            if (typeof SoundEngine !== 'undefined') SoundEngine.playCorrect();
        } else {
            if (typeof SoundEngine !== 'undefined') SoundEngine.playWrong();
        }
    }
};

// ==========================================
// 3. ЛОГИКА АДМИНИСТРАТОРА
// ==========================================

const Admin = {
    login() {
        const pinVal = document.getElementById('pin') ? document.getElementById('pin').value : "";
        if (pinVal === "God is one") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
        }
    },

    setStep(step) { db.ref('game').update({ step: step }); },

    async runAuto() {
        // Очистка базы от ошибок перед началом
        await db.ref('players/undefined').remove();

        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // Обнуляем выборы игроков перед новым вопросом
            const playersSnap = await db.ref('players').once('value');
            const updates = {};
            playersSnap.forEach(child => { updates[`players/${child.key}/lastChoice`] = -1; });
            await db.ref().update(updates);

            // 1. Приготовьтесь
            await db.ref('game').set({ 
                step: 'getready', 
                qIdx: i, 
                serverStartTime: firebase.database.ServerValue.TIMESTAMP 
            });
            await new Promise(r => setTimeout(r, 4000));

            // 2. Вопрос
            await db.ref('game').update({ 
                step: 'game',
                serverStartTime: firebase.database.ServerValue.TIMESTAMP 
            });
            await new Promise(r => setTimeout(r, 21000));

            // 3. Результаты и статистика
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 6000));
        }
        // ФИНАЛЬНЫЙ ПОДИУМ
        db.ref('game').update({ step: 'podium' });
    },

    reset() {
        if (confirm("ПОЛНЫЙ СБРОС ВСЕХ ДАННЫХ?")) {
            db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
            localStorage.clear();
            location.reload();
        }
    }
};

// ==========================================
// 4. СИНХРОНИЗАЦИЯ ТАЙМЕРА (БЕЗ NaN)
// ==========================================

function startSyncTimer(startTime) {
    clearInterval(state.syncTimer);
    
    // Защита от "зависания" на ПК: 
    // Firebase может передать объект-заглушку вместо числа в первую миллисекунду.
    if (!startTime || typeof startTime !== 'number') {
        // Если время еще не пришло от сервера, ставим дефолт и ждем следующего апдейта
        const el = document.getElementById('timer-sec');
        if (el) el.innerText = "20";
        return; 
    }

    state.syncTimer = setInterval(() => {
        // Используем смещение сервера для точности (ServerValue.TIMESTAMP)
        const nowServer = Date.now() + (state.serverOffset || 0);
        const elapsed = Math.floor((nowServer - startTime) / 1000);
        
        let left = 20 - elapsed;
        if (left < 0) left = 0;
        
        const el = document.getElementById('timer-sec');
        if (el) {
            el.innerText = left;
            
            // Визуальные эффекты при малом времени
            if (left <= 5 && left > 0) {
                el.style.color = "#e21b3c";
                if (typeof SoundEngine !== 'undefined') SoundEngine.playTick();
            } else {
                el.style.color = "white";
            }

            if (left === 0) {
                state.canHit = false;
                const grid = document.getElementById('ans-grid');
                if (grid) grid.style.opacity = "0.3";
                clearInterval(state.syncTimer);
            }
        }
    }, 200); // Увеличена частота проверки (раз в 200мс) для плавности на ПК
}

// ==========================================
// 5. ЕДИНЫЙ СЛУШАТЕЛЬ СОСТОЯНИЙ
// ==========================================

db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    state.currentQIdx = g.qIdx;

    // АВТО-ВХОД ДЛЯ ОПОЗДАВШИХ: если игрок зашел в середине игры
    if (!state.myNick && g.step !== 'lobby') {
        User.join(); 
    }

    // Смена экранов
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

// ГЛАВНЫЙ СЛУШАТЕЛЬ ИГРОКОВ (Статистика + Отображение всех)
db.ref('players').on('value', snap => {
    const pData = snap.val() || {};
    // Чистка ошибок
    if (pData.undefined) db.ref('players/undefined').remove();

    const allPlayersEntries = Object.entries(pData).filter(([name]) => name !== "undefined" && name !== "");
    const sortedPlayers = [...allPlayersEntries].sort((a, b) => b[1].score - a[1].score);
    
    // 1. Лобби (Отображаем абсолютно ВСЕХ)
    const lobby = document.getElementById('player-tags');
    if (lobby) {
        lobby.innerHTML = allPlayersEntries.map(([n]) => `<div class="tag">${n}</div>`).join('');
    }
    
    const counter = document.getElementById('online-counter');
    if (counter) counter.innerText = `${allPlayersEntries.length} студентов в игре`;

    // 2. Статистика (Графики ответов)
    let stats = [0, 0, 0, 0];
    allPlayersEntries.forEach(([_, data]) => {
        if (data.lastChoice >= 0) stats[data.lastChoice]++;
    });
    stats.forEach((count, i) => {
        const bar = document.getElementById(`bar-${i}`);
        const countTxt = document.getElementById(`count-${i}`);
        if (bar) bar.style.height = (count * 15) + "px"; 
        if (countTxt) countTxt.innerText = count;
    });

    // 3. ГЕНЕРАЦИЯ РЕЙТИНГА (Все игроки, независимо от баллов)
    const fullListHtml = sortedPlayers.map(([n, d], i) => `
        <div class="podium-row ${i === 0 && d.score > 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${n}</span>
            <b>${d.score}</b>
        </div>
    `).join('') || "<div class='tag'>Ожидание участников...</div>";

    // Вывод в оба контейнера
    const leaderboardBox = document.getElementById('round-leaderboard');
    if (leaderboardBox) leaderboardBox.innerHTML = fullListHtml;
    
    const finalPodiumBox = document.getElementById('podium-final');
    if (finalPodiumBox) finalPodiumBox.innerHTML = fullListHtml;

    // Счетчик ответов на экране
    const ansCountDisplay = document.getElementById('ans-count');
    const actualAnswers = allPlayersEntries.filter(([_, d]) => d.lastChoice >= 0).length;
    if (ansCountDisplay) ansCountDisplay.innerText = actualAnswers;
});

// ==========================================
// 6. ВИЗУАЛЬНЫЕ ЭФФЕКТЫ
// ==========================================

function createConfetti() {
    for (let i = 0; i < 80; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = ['#ff3366','#2de2e2','#f8e71c','#7ed321','#ffffff'][Math.floor(Math.random()*5)];
        c.style.width = Math.random() * 12 + 6 + 'px';
        c.style.height = c.style.width;
        document.body.appendChild(c);
        c.animate([
            { top: '-10%', transform: 'rotate(0deg)' },
            { top: '110%', transform: 'rotate(720deg)' }
        ], { 
            duration: 2000 + Math.random() * 3000, 
            iterations: Infinity 
        });
    }
}

// Инициализация при загрузке
if (state.myNick && state.myNick !== "undefined") {
    User.renderIdentity();
}

// Привязка объектов к глобальному окну
window.User = User; window.Admin = Admin;
