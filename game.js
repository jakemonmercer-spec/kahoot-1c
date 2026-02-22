// ============================================================
// 1. БАЗА ДАННЫХ: 12 ВОПРОСОВ (7 по Лабе №6 + 5 Базовых)
// ============================================================

const QUIZ_DATA = [
    { 
        q: "Для чего предназначен объект конфигурации «Отчет»?", 
        a: ["Для хранения паролей пользователей", "Для анализа данных и вывода сводной информации", "Для ввода новых сотрудников в базу", "Для удаления истории изменений"], 
        c: 1 
    },
    { 
        q: "Как создать отчет с помощью конструктора (СКД)?", 
        a: ["Написать код в Модуле объекта", "Использовать стандартный Макет", "Добавить объект 'Отчет' и настроить Схему компоновки", "Создать текстовый файл"], 
        c: 2 
    },
    { 
        q: "Что такое виртуальная таблица «ОстаткиИОбороты»?", 
        a: ["Список всех картинок интерфейса", "Таблица, которая сама считает приход, расход и остатки", "Архив удаленных документов", "Таблица для внутреннего чата"], 
        c: 1 
    },
    { 
        q: "Какие поля нужно выбрать для отчета «Материалы» в Лабе №6?", 
        a: ["Цвет, Размер и Вес", "Склад, Материал, Остатки и Обороты", "Имя директора и его телефон", "Адрес склада"], 
        c: 1 
    },
    { 
        q: "Для чего нужны параметры «Начало периода» и «Конец периода»?", 
        a: ["Для украшения интерфейса", "Чтобы ограничить данные отчета конкретными датами", "Для регистрации нового пользователя", "Для ускорения работы браузера"], 
        c: 1 
    },
    { 
        q: "Как отобразить отчет в разделах (Бухгалтерия, Учет материалов)?", 
        a: ["Создать ссылку на рабочем столе", "Отметить нужные разделы на вкладке «Подсистемы»", "Написать макрос в Excel", "Просто нажать кнопку Сохранить"], 
        c: 1 
    },
    { 
        q: "Как проверить работу отчета в режиме 1С:Предприятие?", 
        a: ["Нажать кнопку «Сформировать»", "Нажать кнопку «Пуск» в Windows", "Зайти в меню Справочники", "Удалить все документы из базы"], 
        c: 0 
    },
    { 
        q: "Как называется режим, в котором программист создает структуру базы?", 
        a: ["Пользовательский режим", "Конфигуратор", "1С:Предприятие", "Браузерный режим"], 
        c: 1 
    },
    { 
        q: "Какой основной фирменный цвет логотипа системы 1С?", 
        a: ["Ярко-синий", "Желто-оранжевый", "Темно-зеленый", "Черный"], 
        c: 1 
    },
    { 
        q: "Как называется компания-разработчик системы «1С:Предприятие»?", 
        a: ["Фирма 1С", "Корпорация Microsoft", "Google LLC", "Apple Inc"], 
        c: 0 
    },
    { 
        q: "В каком объекте 1С хранятся списки (например, товары или клиенты)?", 
        a: ["Справочники", "Документы", "Регистры накопления", "Макеты"], 
        c: 0 
    },
    { 
        q: "Какой объект в 1С фиксирует событие (например, факт продажи товара)?", 
        a: ["Отчет", "Документ", "Константа", "Стиль"], 
        c: 1 
    }
];

// ============================================================
// 2. СПИСОК 30 ЖИВОТНЫХ ДЛЯ АВТОМАТИЧЕСКОГО ВХОДА
// ============================================================

const ANIMAL_NAMES = [
    "Мудрый Кот", "Быстрый Гепард", "Сонная Панда", "Грозный Тигр", "Хитрый Лис", 
    "Смелый Лев", "Тихий Волк", "Веселый Енот", "Гордый Орел", "Умная Сова",
    "Яркий Попугай", "Добрый Слон", "Ловкий Мангуст", "Крутой Бобер", "Синий Кит",
    "Золотой Олень", "Снежный Барс", "Дикий Кабан", "Вольный Конь", "Лесной Олень",
    "Черный Гриф", "Белый Медведь", "Рыжая Белка", "Стальной Зубр", "Быстрый Заяц",
    "Зоркий Сокол", "Могучий Лось", "Пятнистый Жираф", "Речная Выдра", "Горный Козел"
];

// Глобальное состояние игры
let state = {
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    syncTimer: null,
    serverOffset: 0
};

// Получаем смещение времени с серверами Google для устранения ошибки NaN
db.ref('.info/serverTimeOffset').on('value', snap => {
    state.serverOffset = snap.val() || 0;
});

// ============================================================
// 3. ЛОГИКА ИГРОКА (USER ENGINE)
// ============================================================

const User = {
    // Автоматический вход (срабатывает сразу при открытии ссылки)
    async autoJoin() {
        if (typeof SoundEngine !== 'undefined') SoundEngine.init();
        
        // Если ника нет в памяти — даем случайное животное
        if (!state.myNick) {
            const randomAnimal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
            state.myNick = randomAnimal + " #" + Math.floor(Math.random() * 100);
            localStorage.setItem('quiz_nick', state.myNick);
        }

        const playerRef = db.ref('players/' + state.myNick);
        
        // Регистрируем в базе (счет 0, выбор -1)
        await playerRef.update({ 
            score: 0, 
            lastChoice: -1,
            lastActive: firebase.database.ServerValue.TIMESTAMP 
        });

        // Удаление из базы при закрытии вкладки или потере интернета
        playerRef.onDisconnect().remove();

        this.renderIdentity();
        console.log("Joined as: " + state.myNick);
        
        // Обновляем визуальное отображение ника в лобби
        const nameDisp = document.getElementById('current-name-display');
        if (nameDisp) nameDisp.innerText = "Ваш текущий ник: " + state.myNick;
    },

    // Ручное изменение имени
    async manualJoin() {
        const newNick = document.getElementById('p-nick').value.trim();
        if (!newNick) return alert("Пожалуйста, введите имя!");
        
        // Удаляем старое имя из базы перед сменой
        if (state.myNick) db.ref('players/' + state.myNick).remove();
        
        state.myNick = newNick;
        localStorage.setItem('quiz_nick', state.myNick);
        this.autoJoin(); // Перезаходим
    },

    renderIdentity() {
        let idTag = document.getElementById('player-id-tag');
        if (!idTag) {
            idTag = document.createElement('div');
            idTag.id = 'player-id-tag';
            idTag.className = 'player-identity';
            document.body.appendChild(idTag);
        }
        idTag.innerText = `Вы: ${state.myNick}`;
    },

    hit(idx) {
        if (!state.canHit || !state.myNick) return;
        state.canHit = false;
        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        
        // Визуально блокируем сетку
        const grid = document.getElementById('ans-grid');
        if (grid) grid.style.opacity = "0.3";

        // Отправляем выбор в базу для статистики (графиков)
        db.ref('players/' + state.myNick + '/lastChoice').set(idx);

        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timerEl = document.getElementById('timer-sec');
            let timeLeft = timerEl ? parseInt(timerEl.innerText) : 0;
            // Расчет: 500 база + бонус за скорость
            let points = 500 + (isNaN(timeLeft) ? 0 : timeLeft * 25);
            db.ref('players/' + state.myNick + '/score').transaction(s => (s || 0) + points);
            if (typeof SoundEngine !== 'undefined') SoundEngine.playCorrect();
        } else {
            if (typeof SoundEngine !== 'undefined') SoundEngine.playWrong();
        }
    }
};

// ============================================================
// 4. ЛОГИКА АДМИНИСТРАТОРА (ADMIN ENGINE)
// ============================================================

const Admin = {
    login() {
        const pinVal = document.getElementById('pin').value;
        if (pinVal === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
        }
    },

    setStep(step) { db.ref('game').update({ step: step }); },

    async runAuto() {
        // Чистим "призраков" перед стартом
        await db.ref('players/undefined').remove();

        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // Сброс выбора у ВСЕХ игроков перед новым вопросом
            const playersSnap = await db.ref('players').once('value');
            const updates = {};
            playersSnap.forEach(child => { updates[`players/${child.key}/lastChoice`] = -1; });
            await db.ref().update(updates);

            // 1. ПРИГОТОВЬТЕСЬ
            await db.ref('game').set({ step: 'getready', qIdx: i, serverStartTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 4000));

            // 2. ВОПРОС
            await db.ref('game').update({ step: 'game', serverStartTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 21000));

            // 3. РЕЗУЛЬТАТЫ
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 6500));
        }
        db.ref('game').update({ step: 'podium' });
    },

    async reset() {
        if (confirm("ВНИМАНИЕ! Это очистит кэш у всех игроков и сбросит систему. Продолжить?")) {
            await db.ref('game/step').set('global-reset');
            setTimeout(() => {
                db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
                localStorage.clear();
                location.reload();
            }, 500);
        }
    }
};

// ============================================================
// 5. СИНХРОНИЗАЦИЯ ТАЙМЕРА (GOOGLE SERVER TIME)
// ============================================================

function startSyncTimer(startTime) {
    clearInterval(state.syncTimer);
    if (!startTime) return;
    
    state.syncTimer = setInterval(() => {
        // Рассчитываем точное время на основе смещения сервера
        const elapsed = Math.floor(((Date.now() + state.serverOffset) - startTime) / 1000);
        let left = 20 - elapsed;
        
        if (left < 0) left = 0;
        
        const el = document.getElementById('timer-sec');
        if (el) {
            el.innerText = isNaN(left) ? "20" : left;
            if (left <= 5 && left > 0 && typeof SoundEngine !== 'undefined') SoundEngine.playTick();
            if (left === 0) { 
                state.canHit = false; 
                if(document.getElementById('ans-grid')) document.getElementById('ans-grid').style.opacity = "0.3"; 
                clearInterval(state.syncTimer); 
            }
        }
    }, 1000);
}

// ============================================================
// 6. ГЛАВНЫЕ СЛУШАТЕЛИ FIREBASE (SYNC ENGINE)
// ============================================================

db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    
    // Сигнал глобального сброса памяти
    if (g.step === 'global-reset') {
        localStorage.clear();
        location.reload();
        return;
    }

    state.currentQIdx = g.qIdx;
    
    // Смена экранов
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + g.step);
    if (target) target.classList.add('active');

    if (g.step === 'game') {
        state.canHit = true;
        if(document.getElementById('ans-grid')) document.getElementById('ans-grid').style.opacity = "1";
        
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
    // Фильтруем всех живых игроков
    const allPlayers = Object.entries(pData).filter(([n]) => n !== "undefined");
    const sorted = [...allPlayers].sort((a, b) => b[1].score - a[1].score);
    
    // 1. УМНЫЙ LABEL (ВЕРХНЯЯ ПАНЕЛЬ)
    const labelCount = document.getElementById('players-online-count');
    const labelNames = document.getElementById('players-names-line');
    if (labelCount) labelCount.innerText = allPlayers.length;
    if (labelNames) {
        labelNames.innerText = allPlayers.slice(0, 10).map(([n]) => n).join(', ') + (allPlayers.length > 10 ? '...' : '');
    }

    // 2. ОБНОВЛЕНИЕ ЛОББИ (Теги)
    const lobby = document.getElementById('player-tags');
    if (lobby) lobby.innerHTML = allPlayers.map(([n]) => `<div class="tag">${n}</div>`).join('');

    // 3. СТАТИСТИКА (ГРАФИКИ СТОЛБИКОВ)
    let stats = [0, 0, 0, 0];
    allPlayers.forEach(([_, d]) => { if (d.lastChoice >= 0) stats[d.lastChoice]++; });
    stats.forEach((count, i) => {
        const bar = document.getElementById(`bar-${i}`);
        const countTxt = document.getElementById(`count-${i}`);
        if (bar) bar.style.height = (count * 20 + 5) + "px"; 
        if (countTxt) countTxt.innerText = count;
    });

    // 4. РЕЙТИНГ (ВСЕ ИГРОКИ, ДАЖЕ С 0)
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

// ============================================================
// 7. ЭФФЕКТЫ И МОДАЛКИ
// ============================================================

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

// ПРИНУДИТЕЛЬНЫЙ ЗАПУСК АВТО-ВХОДА ПРИ ЗАГРУЗКЕ
User.autoJoin();

window.User = User; window.Admin = Admin;
