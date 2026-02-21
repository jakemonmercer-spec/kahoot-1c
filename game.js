// ==========================================
// 1. ДАННЫЕ И КОНСТАНТЫ
// ==========================================

// Вопросы строго по 6-й Лабораторной работе 1С
const QUIZ_DATA = [
    { 
        q: "Для чего предназначен объект 'Отчет' в 1С?", 
        a: ["Для ввода новых данных в базу", "Для анализа и вывода сводной информации", "Для хранения списка всех сотрудников", "Для удаления старых записей"], 
        c: 1 
    },
    { 
        q: "Какой основной инструмент используется в 6-й лабе для создания отчета?", 
        a: ["Макет оформления", "Конструктор форм", "СКД (Система компоновки данных)", "Модуль объекта"], 
        c: 2 
    },
    { 
        q: "Какую виртуальную таблицу мы выбрали в Конструкторе запроса?", 
        a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], 
        c: 2 
    },
    { 
        q: "Зачем в настройках СКД добавляется группировка 'Детальные записи'?", 
        a: ["Чтобы скрыть итоги", "Для вывода подробных строк (Склад, Товар)", "Для защиты отчета паролем", "Это техническая ошибка"], 
        c: 1 
    },
    { 
        q: "Что нужно сделать, чтобы пользователь мог сам менять даты отчета в '1С:Предприятие'?", 
        a: ["Включить параметры в 'Пользовательские настройки'", "Изменить длину кода справочника", "Переименовать подсистему", "Написать код на языке C++"], 
        c: 0 
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

// Глобальное состояние
let state = {
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    syncTimer: null,
    serverOffset: 0
};

// Получаем смещение времени сервера Google для идеальной синхронизации
db.ref('.info/serverTimeOffset').on('value', snap => {
    state.serverOffset = snap.val() || 0;
});

// ==========================================
// 2. ЛОГИКА ИГРОКА
// ==========================================

const User = {
    async join(autoNick = "") {
        if (typeof SoundEngine !== 'undefined') SoundEngine.init();
        
        let nameToUse = autoNick || document.getElementById('p-nick').value.trim();
        
        // Если имя пустое - берем животное + рандомное число
        if (!nameToUse) {
            const randomAnimal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
            nameToUse = randomAnimal + " " + Math.floor(Math.random() * 100);
        }
        
        state.myNick = nameToUse;
        localStorage.setItem('quiz_nick', state.myNick);

        const playerRef = db.ref('players/' + state.myNick);
        await playerRef.update({ 
            score: 0, 
            lastActive: firebase.database.ServerValue.TIMESTAMP 
        });

        // Автоматическое удаление при закрытии вкладки (Activity Control)
        playerRef.onDisconnect().remove();

        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        this.renderIdentity();
        
        const joinCard = document.getElementById('join-card');
        if (joinCard) joinCard.innerHTML = `<h2 style="color:#333; font-weight:900;">ВЫ В ИГРЕ!<br><small>${state.myNick}</small></h2>`;
    },

    renderIdentity() {
        if (!state.myNick || state.myNick === "undefined") return;
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
        if (!state.canHit || !state.myNick || state.myNick === "undefined") return;
        state.canHit = false;
        
        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        document.getElementById('ans-grid').style.opacity = "0.3";

        // Проверка ответа
        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timerEl = document.getElementById('timer-sec');
            let timeLeft = timerEl ? parseInt(timerEl.innerText) : 0;
            if (isNaN(timeLeft)) timeLeft = 0;

            // Баллы Kahoot: 500 база + (секунды * 25)
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
        if (document.getElementById('pin').value === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
            if (typeof SoundEngine !== 'undefined') SoundEngine.playStart();
        } else {
            alert("Неверный PIN");
        }
    },

    setStep(step) {
        db.ref('game').update({ step: step });
    },

    async runAuto() {
        // Очистка призраков перед стартом
        await db.ref('players/undefined').remove();

        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // ЭТАП 1: Подготовка (4 секунды)
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

            // ЭТАП 3: Результаты раунда (6 секунд)
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 6000));
        }

        // ФИНАЛ
        db.ref('game').update({ step: 'podium' });
    },

    reset() {
        if (confirm("ВНИМАНИЕ: Это полностью очистит базу данных. Продолжить?")) {
            db.ref('/').set({ 
                game: { step: 'lobby', qIdx: -1 }, 
                players: {} 
            });
            localStorage.clear();
            location.reload();
        }
    }
};

// ==========================================
// 4. СИНХРОНИЗАЦИЯ ТАЙМЕРА И СОСТОЯНИЙ
// ==========================================

function startSyncTimer(startTime) {
    clearInterval(state.syncTimer);
    if (!startTime) return;

    state.syncTimer = setInterval(() => {
        const nowServer = Date.now() + state.serverOffset;
        const elapsed = Math.floor((nowServer - startTime) / 1000);
        let left = 20 - elapsed;

        if (left < 0) left = 0;
        
        const timerEl = document.getElementById('timer-sec');
        if (timerEl) {
            timerEl.innerText = left;
            if (left <= 5 && left > 0) {
                if (typeof SoundEngine !== 'undefined') SoundEngine.playTick();
            }
            if (left === 0) {
                state.canHit = false;
                document.getElementById('ans-grid').style.opacity = "0.3";
                clearInterval(state.syncTimer);
            }
        }
    }, 1000);
}

// Слушатель игры (Центральное управление)
db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    state.currentQIdx = g.qIdx;

    // АВТО-ВХОД ДЛЯ ОПОЗДАВШИХ: если игрок зашел, когда игра уже идет
    if (!state.myNick && g.step !== 'lobby') {
        User.join(); 
    }

    // Переключение экранов
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + g.step);
    if (target) target.classList.add('active');

    // Логика конкретных экранов
    if (g.step === 'game') {
        state.canHit = true;
        document.getElementById('ans-grid').style.opacity = "1";
        
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

// Слушатель игроков (Лидерборд в реальном времени)
db.ref('players').on('value', snap => {
    const playersData = snap.val() || {};
    
    // Удаляем призраков
    if (playersData.undefined) db.ref('players/undefined').remove();

    const sorted = Object.entries(playersData)
        .filter(([name]) => name !== "undefined")
        .sort((a, b) => b[1].score - a[1].score);
    
    // 1. Обновляем Лобби (Список имен)
    const lobbyList = document.getElementById('player-tags');
    if (lobbyList) {
        lobbyList.innerHTML = sorted.map(([name]) => `<div class="tag">${name}</div>`).join('');
    }
    
    const counter = document.getElementById('online-counter');
    if (counter) counter.innerText = `${sorted.length} игроков в сети`;

    // 2. Рендерим ТОП-5 (Даже если баллы 0)
    const podiumHtml = sorted.slice(0, 5).map(([name, data], i) => `
        <div class="winner-row ${i === 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${name}</span>
            <b>${data.score}</b>
        </div>
    `).join('') || "<div class='tag'>Ожидание участников...</div>";
    
    const roundBox = document.getElementById('round-leaderboard');
    if (roundBox) roundBox.innerHTML = podiumHtml;
    
    const finalBox = document.getElementById('podium-final');
    if (finalBox) finalBox.innerHTML = podiumHtml;

    // 3. Счетчик ответов
    const ansCounter = document.getElementById('ans-count');
    if (ansCounter) ansCounter.innerText = sorted.length;
});

// ==========================================
// 5. ВИЗУАЛЬНЫЕ ЭФФЕКТЫ
// ==========================================

function createConfetti() {
    for (let i = 0; i < 70; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = ['#f0f', '#0ff', '#ff0', '#0f0', '#f00'][Math.floor(Math.random()*5)];
        c.style.width = Math.random() * 10 + 5 + 'px';
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

// Запуск плашки имени при загрузке
if (state.myNick && state.myNick !== "undefined") User.renderIdentity();

// Экспорт объектов
window.User = User;
window.Admin = Admin;
