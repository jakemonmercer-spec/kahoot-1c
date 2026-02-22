/**
 * ГЛАВНАЯ ЛОГИКА QUIZ 1C (Enterprise Edition)
 * Полная синхронизация, автоматические имена и защита от вылетов
 */

// 1. БАЗА ВОПРОСОВ
const QUIZ_DATA = [
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

// 2. РАНДОМНЫЕ ИМЕНА (ДЛЯ ТЕХ КТО НЕ ВВЕЛ)
const ANIMAL_NAMES = [
    "Мудрый Кот", "Быстрый Гепард", "Сонная Панда", "Грозный Тигр", "Хитрый Лис", 
    "Смелый Лев", "Тихий Волк", "Веселый Енот", "Гордый Орел", "Умный Сова",
    "Яркий Попугай", "Добрый Слон", "Ловкий Мангуст", "Крутой Бобер", "Синий Кит",
    "Золотой Олень", "Снежный Барс", "Дикий Кабан", "Вольный Конь", "Лесной Олень"
];

// 3. СОСТОЯНИЕ
let state = {
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    syncTimer: null,
    serverOffset: 0
};

// Вычисляем разницу времени с сервером Firebase
db.ref('.info/serverTimeOffset').on('value', snap => {
    state.serverOffset = snap.val() || 0;
});

// 4. ЛОГИКА ПОЛЬЗОВАТЕЛЯ
const User = {
    // Генерация случайного ника
    generateNick() {
        const name = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
        const num = Math.floor(Math.random() * 899) + 100;
        return `${name} #${num}`;
    },

    // Вход в игру (вызывается автоматически при загрузке)
    async join(manualName = null) {
        // Если инициализируем звук
        if (window.SoundEngine) window.SoundEngine.init();

        // 1. Определяем имя
        if (manualName) {
            state.myNick = manualName;
        } else if (!state.myNick || state.myNick === "undefined" || state.myNick === "null") {
            state.myNick = this.generateNick();
        }

        // 2. Сохраняем локально
        localStorage.setItem('quiz_nick', state.myNick);

        // 3. Отправляем в Firebase
        const playerRef = db.ref('players/' + state.myNick);
        await playerRef.update({
            score: 0,
            lastChoice: -1,
            lastActive: firebase.database.ServerValue.TIMESTAMP
        });

        // 4. Удаление при дисконнекте (если закрыл вкладку)
        playerRef.onDisconnect().remove();

        // 5. Показываем плашку с именем
        this.renderIdentity();

        // Обновляем UI в лобби, если игрок ввел имя вручную
        const card = document.getElementById('join-card');
        if (card && manualName) {
            card.innerHTML = `<h2 style="color:#333; font-weight:900;">ВЫ В ИГРЕ!<br><small style="color:#46178f">${state.myNick}</small></h2>`;
        }
    },

    renderIdentity() {
        if (!state.myNick) return;
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
        
        if (window.SoundEngine) window.SoundEngine.playTap();
        
        const grid = document.getElementById('ans-grid');
        if (grid) grid.style.opacity = "0.3";

        // Сохраняем выбор в БД для графиков
        db.ref('players/' + state.myNick + '/lastChoice').set(idx);

        // Проверка правильности
        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timerEl = document.getElementById('timer-sec');
            let timeLeft = timerEl ? parseInt(timerEl.innerText) : 0;
            let points = 500 + (timeLeft * 25);
            db.ref('players/' + state.myNick + '/score').transaction(s => (s || 0) + points);
            if (window.SoundEngine) window.SoundEngine.playCorrect();
        } else {
            if (window.SoundEngine) window.SoundEngine.playWrong();
        }
    },

    logout() {
        localStorage.removeItem('quiz_nick');
        location.reload();
    }
};

// 5. ЛОГИКА АДМИНА
const Admin = {
    login() {
        const pin = document.getElementById('pin').value;
        if (pin === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
        }
    },

    setStep(step) { db.ref('game').update({ step: step }); },

    async runAuto() {
        if (!confirm("Запустить автоматический цикл из 12 вопросов?")) return;
        
        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // Сброс ответов игроков
            const playersSnap = await db.ref('players').once('value');
            const updates = {};
            playersSnap.forEach(p => { updates[`players/${p.key}/lastChoice`] = -1; });
            if (Object.keys(updates).length > 0) await db.ref().update(updates);

            // 1. Приготовьтесь
            await db.ref('game').set({ step: 'getready', qIdx: i, serverStartTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 4000));

            // 2. Вопрос
            await db.ref('game').update({ step: 'game', serverStartTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 21000));

            // 3. Результаты
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 7000));
        }
        // Финал
        db.ref('game').update({ step: 'podium' });
    },

    async reset() {
        if (!confirm("ВНИМАНИЕ! Это сотрет всех игроков и принудительно сменит им имена. Продолжить?")) return;
        
        // Посылаем всем сигнал на перезагрузку
        await db.ref('game/step').set('FORCE_RESET_SIGNAL');
        
        setTimeout(async () => {
            await db.ref('/').set({ 
                game: { step: 'lobby', qIdx: -1 }, 
                players: {} 
            });
            localStorage.removeItem('quiz_nick');
            location.reload();
        }, 800);
    }
};

// 6. ТАЙМЕР
function startSyncTimer(startTime) {
    clearInterval(state.syncTimer);
    if (!startTime) return;

    state.syncTimer = setInterval(() => {
        const now = Date.now() + state.serverOffset;
        const elapsed = Math.floor((now - startTime) / 1000);
        let left = 20 - elapsed;
        
        if (left < 0) left = 0;
        
        const el = document.getElementById('timer-sec');
        if (el) {
            el.innerText = left;
            if (left <= 5 && left > 0 && window.SoundEngine) window.SoundEngine.playTick();
            if (left === 0) {
                state.canHit = false;
                if (document.getElementById('ans-grid')) document.getElementById('ans-grid').style.opacity = "0.3";
                clearInterval(state.syncTimer);
            }
        }
    }, 1000);
}

// 7. СИНХРОНИЗАЦИЯ ЭКРАНОВ
db.ref('game').on('value', snap => {
    const g = snap.val() || {};
    
    // Глобальный сброс по команде админа
    if (g.step === 'FORCE_RESET_SIGNAL') {
        localStorage.removeItem('quiz_nick');
        location.reload();
        return;
    }

    state.currentQIdx = g.qIdx;
    
    // Переключение экранов
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + g.step);
    if (target) target.classList.add('active');

    // Логика вопроса
    if (g.step === 'game') {
        state.canHit = true;
        const grid = document.getElementById('ans-grid');
        if (grid) grid.style.opacity = "1";
        
        const q = QUIZ_DATA[g.qIdx];
        if (q) {
            document.getElementById('q-text').innerText = q.q;
            const btns = document.querySelectorAll('.ans-btn .t');
            q.a.forEach((text, i) => { if (btns[i]) btns[i].innerText = text; });
        }
        startSyncTimer(g.serverStartTime);
    }

    // Логика финала
    if (g.step === 'podium') {
        if (window.SoundEngine) window.SoundEngine.playFanfare();
        if (typeof createConfetti === 'function') createConfetti();
    }
});

// 8. СИНХРОНИЗАЦИЯ СПИСКОВ И РЕЙТИНГА
db.ref('players').on('value', snap => {
    const players = snap.val() || {};
    const entries = Object.entries(players).filter(([name]) => name !== "undefined" && name !== "null");
    const sorted = [...entries].sort((a, b) => (b[1].score || 0) - (a[1].score || 0));

    // Обновляем счетчик
    const counter = document.getElementById('online-counter');
    if (counter) counter.innerText = `Участников онлайн: ${entries.length}`;

    // Обновляем лобби (облако имен)
    const lobbyList = document.getElementById('player-tags');
    if (lobbyList) {
        lobbyList.innerHTML = entries.map(([name]) => `<div class="tag">${name}</div>`).join('');
    }

    // Обновляем статистику ответов (графики)
    let stats = [0, 0, 0, 0];
    entries.forEach(([_, data]) => {
        if (data.lastChoice !== undefined && data.lastChoice >= 0) {
            stats[data.lastChoice]++;
        }
    });
    stats.forEach((count, i) => {
        const bar = document.getElementById(`bar-${i}`);
        const txt = document.getElementById(`count-${i}`);
        if (bar) bar.style.height = (count * 20 + 5) + "px";
        if (txt) txt.innerText = count;
    });

    // Обновляем рейтинги (в результатах и в финале)
    const listHtml = sorted.map(([name, data], i) => `
        <div class="podium-row ${i === 0 && (data.score || 0) > 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${name}</span>
            <b>${data.score || 0}</b>
        </div>
    `).join('');

    const roundBoard = document.getElementById('round-leaderboard');
    if (roundBoard) roundBoard.innerHTML = listHtml || "Ожидаем участников...";

    const finalBoard = document.getElementById('podium-final');
    if (finalBoard) finalBoard.innerHTML = listHtml || "Нет данных";

    // Счетчик ответов на текущий вопрос
    const ansCountDisplay = document.getElementById('ans-count');
    if (ansCountDisplay) {
        const totalAnswers = entries.filter(([_, d]) => d.lastChoice !== undefined && d.lastChoice >= 0).length;
        ansCountDisplay.innerText = totalAnswers;
    }
});

// ЭФФЕКТ КОНФЕТТИ
function createConfetti() {
    for (let i = 0; i < 60; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = ['#ffcc00', '#e21b3c', '#1368ce', '#26890c', '#ffffff'][Math.floor(Math.random() * 5)];
        document.body.appendChild(c);
        c.animate([
            { top: '-10%', transform: 'rotate(0deg)' },
            { top: '110%', transform: `rotate(${Math.random() * 360}deg)` }
        ], { duration: Math.random() * 2000 + 2000, iterations: Infinity });
    }
}

// РУЧНОЙ ВХОД ЧЕРЕЗ КНОПКУ
window.handleJoinBtn = () => {
    const input = document.getElementById('p-nick');
    if (input && input.value.trim().length > 1) {
        User.join(input.value.trim());
    } else {
        alert("Пожалуйста, введите нормальное имя!");
    }
};

// ЗАПУСК ПРИ ЗАГРУЗКЕ
window.addEventListener('load', () => {
    // Каждого вошедшего СРАЗУ регистрируем
    User.join();
});

// Экспорт для HTML
window.User = User;
window.Admin = Admin;
