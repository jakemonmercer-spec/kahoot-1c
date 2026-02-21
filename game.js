// ==========================================
// 1. ДАННЫЕ ВОПРОСОВ (Лабораторная №6)
// ==========================================
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

// ==========================================
// 2. СПИСОК 30 ЖИВОТНЫХ ДЛЯ АВТО-ИМЕН
// ==========================================
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

// Получаем разницу во времени с сервером Google один раз при загрузке
db.ref('.info/serverTimeOffset').on('value', snap => {
    state.serverOffset = snap.val() || 0;
});

// ==========================================
// 3. ЛОГИКА ИГРОКА (User)
// ==========================================

const User = {
    async join(forcedNick = "") {
        // Инициализируем звуковой движок при первом взаимодействии
        if (typeof SoundEngine !== 'undefined') SoundEngine.init();
        
        let nameToUse = forcedNick || document.getElementById('p-nick').value.trim();
        
        // Если имя пустое - назначаем животное + случайное число
        if (!nameToUse) {
            const randomAnimal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
            nameToUse = randomAnimal + " " + Math.floor(Math.random() * 99);
        }
        
        // Защита от создания игрока "undefined"
        if (nameToUse === "undefined" || !nameToUse) return;

        state.myNick = nameToUse;
        localStorage.setItem('quiz_nick', state.myNick);

        const playerRef = db.ref('players/' + state.myNick);
        
        // ГАРАНТИРОВАННО создаем игрока со счетом 0, чтобы он сразу появился в списках
        await playerRef.set({ 
            score: 0, 
            lastActive: firebase.database.ServerValue.TIMESTAMP 
        });

        // Автоматическое удаление при дисконнекте (если вкладка закрыта)
        playerRef.onDisconnect().remove();

        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        this.renderIdentity();
        
        // Скрываем форму входа
        const joinCard = document.getElementById('join-card');
        if (joinCard) joinCard.innerHTML = `<h2 style="color:#333; font-weight:900;">ВЫ В ИГРЕ!<br><small>${state.myNick}</small></h2>`;
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
        // Блокировка, если игрок не ввел имя, если время вышло или если он уже нажал
        if (!state.canHit || !state.myNick || state.myNick === "undefined") return;
        state.canHit = false;
        
        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        
        // Визуальный фидбек - кнопки тускнеют
        document.getElementById('ans-grid').style.opacity = "0.3";

        // Проверка на правильность
        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timerEl = document.getElementById('timer-sec');
            let timeLeft = timerEl ? parseInt(timerEl.innerText) : 0;
            if (isNaN(timeLeft)) timeLeft = 0;

            // Формула Kahoot: 500 база + (оставшиеся секунды * 25)
            let points = 500 + (timeLeft * 25);
            db.ref('players/' + state.myNick + '/score').transaction(s => (s || 0) + points);
            
            if (typeof SoundEngine !== 'undefined') SoundEngine.playCorrect();
        } else {
            if (typeof SoundEngine !== 'undefined') SoundEngine.playWrong();
        }
    }
};

// ==========================================
// 4. ЛОГИКА АДМИНИСТРАТОРА (Admin)
// ==========================================

const Admin = {
    login() {
        const pinValue = document.getElementById('pin').value;
        if (pinValue === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
            if (typeof SoundEngine !== 'undefined') SoundEngine.playStart();
        } else {
            alert("Неверный PIN!");
        }
    },

    setStep(step) {
        db.ref('game').update({ step: step });
    },

    async runAuto() {
        // Предварительная чистка мусора в базе
        await db.ref('players/undefined').remove();

        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // ШАГ 1: Экран подготовки (4 секунды)
            await db.ref('game').set({ 
                step: 'getready', 
                qIdx: i, 
                serverStartTime: firebase.database.ServerValue.TIMESTAMP 
            });
            await new Promise(r => setTimeout(r, 4000));

            // ШАГ 2: Экран вопроса (21 секунда для синхронизации)
            await db.ref('game').update({ 
                step: 'game',
                serverStartTime: firebase.database.ServerValue.TIMESTAMP 
            });
            await new Promise(r => setTimeout(r, 21000));

            // ШАГ 3: Экран результатов раунда (6 секунд)
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 6000));
        }

        // ФИНАЛ: Пьедестал
        db.ref('game').update({ step: 'podium' });
    },

    reset() {
        if (confirm("ВНИМАНИЕ: Это удалит всех игроков и сбросит счет. Продолжить?")) {
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
// 5. СИСТЕМА СИНХРОННОГО ТАЙМЕРА
// ==========================================

function startSyncTimer(startTime) {
    clearInterval(state.syncTimer);
    if (!startTime) return;

    state.syncTimer = setInterval(() => {
        // Вычисляем точное время сервера
        const nowServer = Date.now() + state.serverOffset;
        const elapsed = Math.floor((nowServer - startTime) / 1000);
        let left = 20 - elapsed;

        if (left < 0) left = 0;
        
        const timerEl = document.getElementById('timer-sec');
        if (timerEl) {
            timerEl.innerText = isNaN(left) ? "20" : left;
            
            // Звук тиканья в последние 5 секунд
            if (left <= 5 && left > 0) {
                if (typeof SoundEngine !== 'undefined') SoundEngine.playTick();
            }

            // Время вышло
            if (left === 0) {
                state.canHit = false;
                document.getElementById('ans-grid').style.opacity = "0.3";
                clearInterval(state.syncTimer);
            }
        }
    }, 1000);
}

// ==========================================
// 6. ЕДИНЫЙ СЛУШАТЕЛЬ СОСТОЯНИЙ (Engine)
// ==========================================

db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    state.currentQIdx = g.qIdx;

    // АВТО-ВХОД ДЛЯ ОПОЗДАВШИХ
    // Если игра уже началась, а у пользователя нет ника - создаем ему "животное"
    if (!state.myNick && g.step !== 'lobby') {
        User.join(); 
    }

    // Переключение экранов через CSS класс .active
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + g.step);
    if (target) target.classList.add('active');

    // Если текущий шаг - игра, запускаем рендер вопроса
    if (g.step === 'game') {
        state.canHit = true;
        document.getElementById('ans-grid').style.opacity = "1";
        
        const q = QUIZ_DATA[state.currentQIdx];
        if (q) {
            document.getElementById('q-text').innerText = q.q;
            const btnLabels = document.querySelectorAll('.ans-btn .t');
            q.a.forEach((text, i) => { 
                if (btnLabels[i]) btnLabels[i].innerText = text; 
            });
        }
        
        // Стартуем синхронный таймер по метке сервера
        startSyncTimer(g.serverStartTime);
    }
    
    // Если финал - фанфары и конфетти
    if (g.step === 'podium') {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playFanfare();
        createConfetti();
    }
});

// Слушатель игроков: обновление лобби и рейтингов (ВСЕГДА ОТОБРАЖАЕТ ВСЕХ)
db.ref('players').on('value', snap => {
    const pData = snap.val() || {};
    
    // Удаляем технические ошибки (undefined) из базы на лету
    if (pData.undefined) db.ref('players/undefined').remove();

    // Превращаем объект в массив и фильтруем мусор
    const allPlayersArr = Object.entries(pData).filter(([name]) => name !== "undefined");
    
    // Сортировка для рейтинга
    const sortedPlayers = [...allPlayersArr].sort((a, b) => b[1].score - a[1].score);
    
    // 1. Обновляем ЛОББИ (Список всех ников)
    const lobbyContainer = document.getElementById('player-tags');
    if (lobbyContainer) {
        lobbyContainer.innerHTML = allPlayersArr.map(([name]) => `<div class="tag">${name}</div>`).join('');
    }
    
    const counterEl = document.getElementById('online-counter');
    if (counterEl) counterEl.innerText = `${allPlayersArr.length} студентов онлайн`;

    // 2. Обновляем РЕЙТИНГ (ТОП-5, даже если у них 0 баллов)
    const podiumHtml = sortedPlayers.slice(0, 5).map(([name, data], i) => `
        <div class="podium-row ${i === 0 && data.score > 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${name}</span>
            <b>${data.score}</b>
        </div>
    `).join('');

    // Если игроков совсем нет - выводим сообщение
    const finalHtml = podiumHtml || "<div class='tag'>Ждем участников...</div>";
    
    const roundBox = document.getElementById('round-leaderboard');
    if (roundBox) roundBox.innerHTML = finalHtml;
    
    const finalBox = document.getElementById('podium-final');
    if (finalBox) finalBox.innerHTML = finalHtml;

    // 3. Обновляем счетчик ответов на экране вопроса
    const ansCounter = document.getElementById('ans-count');
    if (ansCounter) ansCounter.innerText = allPlayersArr.length;
});

// ==========================================
// 7. ВИЗУАЛЬНЫЕ ЭФФЕКТЫ (Конфетти)
// ==========================================

function createConfetti() {
    for (let i = 0; i < 70; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = ['#ff3366','#2de2e2','#f8e71c','#7ed321','#ff8c00'][Math.floor(Math.random()*5)];
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

// Восстановление сессии при перезагрузке страницы
if (state.myNick && state.myNick !== "undefined") {
    User.renderIdentity();
}

// Глобальный доступ для вызова из HTML кнопок
window.User = User;
window.Admin = Admin;
