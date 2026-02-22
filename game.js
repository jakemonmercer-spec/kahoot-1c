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
// 2. ИМЕНА-ЗАГЛУШКИ ДЛЯ РАНДОМА
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

// Вычисляем смещение времени с серверами Google (убирает NaN на таймере)
db.ref('.info/serverTimeOffset').on('value', snap => {
    state.serverOffset = snap.val() || 0;
});

// ==========================================
// 3. ЛОГИКА ИГРОКА (USER)
// ==========================================

const User = {
    async join() {
        if (typeof SoundEngine !== 'undefined') SoundEngine.init();
        
        let inputField = document.getElementById('p-nick');
        let nameToUse = inputField ? inputField.value.trim() : "";
        
        // 100% ГАРАНТИЯ РАНДОМА: Если поле пустое, назначаем животное с номером
        if (!nameToUse) {
            const randomAnimal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
            nameToUse = randomAnimal + " #" + Math.floor(Math.random() * 1000);
        }
        
        // Защита от системных глюков
        if (nameToUse === "undefined") nameToUse = "Студент #" + Math.floor(Math.random() * 1000);

        // Сохраняем имя в локальную память телефона
        state.myNick = nameToUse;
        localStorage.setItem('quiz_nick', state.myNick);

        // Гарантированно создаем игрока в базе (как ручного, так и рандомного)
        const playerRef = db.ref('players/' + state.myNick);
        await playerRef.set({ 
            score: 0, 
            lastChoice: -1,
            lastActive: firebase.database.ServerValue.TIMESTAMP 
        });

        // Если интернет пропал или закрыл вкладку — удаляем из базы
        playerRef.onDisconnect().remove();

        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        this.renderIdentity();
        
        // Меняем интерфейс
        const joinCard = document.getElementById('join-card');
        if (joinCard) {
            joinCard.innerHTML = `<h2 style="color:#333; font-weight:900;">ВЫ В ИГРЕ!<br><small style="color:#46178f">${state.myNick}</small></h2>`;
        }
    },

    // Очистка памяти телефона (выход)
    logout() {
        localStorage.removeItem('quiz_nick');
        location.reload();
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
        
        const grid = document.getElementById('ans-grid');
        if (grid) grid.style.opacity = "0.3";

        // Отправляем выбор в базу (для графиков)
        db.ref('players/' + state.myNick + '/lastChoice').set(idx);

        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timerEl = document.getElementById('timer-sec');
            let timeLeft = timerEl ? parseInt(timerEl.innerText) : 0;
            if (isNaN(timeLeft)) timeLeft = 0;

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
        
        await db.ref('players/undefined').remove();

        for (let i = 0; i < QUIZ_DATA.length; i++) {
            const playersSnap = await db.ref('players').once('value');
            const updates = {};
            playersSnap.forEach(child => { updates[`players/${child.key}/lastChoice`] = -1; });
            await db.ref().update(updates);

            await db.ref('game').set({ 
                step: 'getready', 
                qIdx: i, 
                serverStartTime: firebase.database.ServerValue.TIMESTAMP 
            });
            await new Promise(r => setTimeout(r, 4000));

            await db.ref('game').update({ 
                step: 'game',
                serverStartTime: firebase.database.ServerValue.TIMESTAMP 
            });
            await new Promise(r => setTimeout(r, 21000));

            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 6500));
        }
        
        db.ref('game').update({ step: 'podium' });
    },

    // ГЛОБАЛЬНЫЙ СБРОС (Очищает базу и кэш на всех телефонах)
    async reset() {
        if (confirm("ВНИМАНИЕ! Это очистит базу и принудительно сбросит кэш у всех игроков. Продолжить?")) {
            // Посылаем всем сигнал на самоуничтожение кэша
            await db.ref('game/step').set('reset');
            
            // Ждем полсекунды, чтобы сигнал дошел до всех, затем чистим базу
            setTimeout(() => {
                db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
                localStorage.clear();
                location.reload();
            }, 500);
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
        const nowServer = Date.now() + state.serverOffset;
        const elapsed = Math.floor((nowServer - serverStartTime) / 1000);
        let left = 20 - elapsed;
        
        if (left < 0) left = 0;
        
        const el = document.getElementById('timer-sec');
        if (el) {
            el.innerText = isNaN(left) ? "20" : left;
            if (left <= 5 && left > 0 && typeof SoundEngine !== 'undefined') SoundEngine.playTick();
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

db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    
    // ПРИНУДИТЕЛЬНЫЙ СБРОС ДЛЯ ВСЕХ УСТРОЙСТВ
    if (g.step === 'reset') {
        localStorage.removeItem('quiz_nick');
        location.reload();
        return; // Останавливаем выполнение
    }

    state.currentQIdx = g.qIdx;

    // АВТО-ВХОД ДЛЯ ОПОЗДАВШИХ
    if (!state.myNick && g.step !== 'lobby' && g.step !== 'wait') {
        User.join(); // Присвоит рандомное имя и сразу добавит в базу
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetView = document.getElementById('view-' + g.step);
    if (targetView) targetView.classList.add('active');

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
        startSyncTimer(g.serverStartTime);
    }
    
    if (g.step === 'podium') {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playFanfare();
        createConfetti();
    }
});

// Слушатель игроков (Отрисовка списков)
db.ref('players').on('value', snap => {
    const pData = snap.val() || {};
    if (pData.undefined) db.ref('players/undefined').remove();

    // Берем всех игроков (даже тех, кто не нажимал кнопки)
    const allPlayersEntries = Object.entries(pData).filter(([name]) => name !== "undefined" && name !== "");
    const sortedPlayers = [...allPlayersEntries].sort((a, b) => b[1].score - a[1].score);
    
    const lobby = document.getElementById('player-tags');
    if (lobby) {
        lobby.innerHTML = allPlayersEntries.map(([n]) => `<div class="tag">${n}</div>`).join('');
    }
    
    const counter = document.getElementById('online-counter');
    if (counter) counter.innerText = `Подключено: ${allPlayersEntries.length} студентов`;

    // Графики статистики
    let stats = [0, 0, 0, 0];
    allPlayersEntries.forEach(([_, data]) => {
        if (data.lastChoice !== undefined && data.lastChoice >= 0) {
            stats[data.lastChoice]++;
        }
    });

    stats.forEach((count, i) => {
        const bar = document.getElementById(`bar-${i}`);
        const countTxt = document.getElementById(`count-${i}`);
        if (bar) bar.style.height = (count * 20 + 5) + "px"; 
        if (countTxt) countTxt.innerText = count;
    });

    // Рейтинг всех участников (даже с 0 баллов)
    let fullRankHtml = sortedPlayers.map(([n, d], i) => `
        <div class="podium-row ${i === 0 && d.score > 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${n}</span>
            <b>${d.score}</b>
        </div>
    `).join('');

    if (allPlayersEntries.length === 0) {
        fullRankHtml = "<div class='tag'>Ждем игроков...</div>";
    }

    const roundLeaderboard = document.getElementById('round-leaderboard');
    if (roundLeaderboard) roundLeaderboard.innerHTML = fullRankHtml;
    
    const podiumFinal = document.getElementById('podium-final');
    if (podiumFinal) podiumFinal.innerHTML = fullRankHtml;

    const ansCountDisplay = document.getElementById('ans-count');
    const answersReceived = allPlayersEntries.filter(([_, d]) => d.lastChoice !== undefined && d.lastChoice >= 0).length;
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

// Восстановление имени при случайной перезагрузке страницы
if (state.myNick && state.myNick !== "undefined") {
    User.renderIdentity();
}

// Глобальный экспорт
window.User = User; 
window.Admin = Admin;
