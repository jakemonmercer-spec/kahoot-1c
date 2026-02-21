// ==========================================
// 1. ДАННЫЕ И ВОПРОСЫ (Лабораторная №6 + База 1С)
// ==========================================

const QUIZ_DATA = [
    // --- Вопросы из Лабораторной №6 ---
    { 
        q: "Для чего предназначен объект конфигурации «Отчет»?", 
        a: ["Для хранения паролей", "Для анализа данных и создания сводных таблиц", "Для ввода новых сотрудников", "Для удаления базы"], 
        c: 1 
    },
    { 
        q: "Как создать отчет с помощью конструктора без написания кода?", 
        a: ["Через Модуль объекта", "Использовать Макет", "Через СКД (Схему компоновки данных)", "Написать в блокноте"], 
        c: 2 
    },
    { 
        q: "Что такое виртуальная таблица «ОстаткиИОбороты»?", 
        a: ["Список всех картинок", "Таблица, которая сама считает приход, расход и остатки", "Архив старых документов", "Таблица для чата"], 
        c: 1 
    },
    { 
        q: "Какие поля критически важны для отчета «Материалы»?", 
        a: ["Цвет и Размер", "Склад, Материал, Остатки и Обороты", "Имя директора и телефон", "Адрес магазина"], 
        c: 1 
    },
    { 
        q: "Для чего нужны параметры «Начало периода» и «Конец периода»?", 
        a: ["Для красоты", "Чтобы ограничить отчет по датам (задать период)", "Для регистрации пользователя", "Для ускорения интернета"], 
        c: 1 
    },
    { 
        q: "Как сделать так, чтобы команда отчета появилась в меню программы?", 
        a: ["Создать ярлык на рабочем столе", "Отметить нужные разделы на вкладке «Подсистемы»", "Написать письмо в техподдержку", "Просто сохранить файл"], 
        c: 1 
    },
    { 
        q: "Какую кнопку нужно нажать в 1С, чтобы отчет вывел данные на экран?", 
        a: ["«Сформировать»", "«Пуск»", "«Записать и закрыть»", "«Провести»"], 
        c: 0 
    },
    // --- Банально простые вопросы про 1С ---
    { 
        q: "Как называется компания-разработчик системы «1С:Предприятие»?", 
        a: ["1С", "Microsoft", "Google", "Apple"], 
        c: 0 
    },
    { 
        q: "Какой основной цвет логотипа и интерфейса 1С?", 
        a: ["Синий", "Желтый / Оранжевый", "Зеленый", "Черный"], 
        c: 1 
    },
    { 
        q: "Как называется режим, в котором программист создает структуру базы?", 
        a: ["Игровой режим", "Конфигуратор", "1С:Предприятие", "Браузер"], 
        c: 1 
    },
    { 
        q: "В каком объекте 1С хранятся списки товаров или клиентов?", 
        a: ["Справочники", "Документы", "Регистры", "Константы"], 
        c: 0 
    },
    { 
        q: "Какой объект в 1С фиксирует событие (например, факт продажи)?", 
        a: ["Отчет", "Документ", "Макет", "Стиль"], 
        c: 1 
    }
];

// Список 30 животных для автоматического присвоения имен
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

// Синхронизация времени с серверами Google
db.ref('.info/serverTimeOffset').on('value', snap => {
    state.serverOffset = snap.val() || 0;
});

// ==========================================
// 2. ЛОГИКА ИГРОКА
// ==========================================

const User = {
    async join(forcedNick = "") {
        if (typeof SoundEngine !== 'undefined') SoundEngine.init();
        
        let nameToUse = forcedNick || (document.getElementById('p-nick') ? document.getElementById('p-nick').value.trim() : "");
        
        if (!nameToUse) {
            const randomAnimal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
            nameToUse = randomAnimal + " #" + Math.floor(Math.random() * 100);
        }
        
        state.myNick = nameToUse;
        localStorage.setItem('quiz_nick', state.myNick);

        const playerRef = db.ref('players/' + state.myNick);
        await playerRef.set({ score: 0, lastChoice: -1, lastActive: firebase.database.ServerValue.TIMESTAMP });
        playerRef.onDisconnect().remove();

        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        this.renderIdentity();
        
        const joinCard = document.getElementById('join-card');
        if (joinCard) joinCard.innerHTML = `<h2 style="color:#333; font-weight:900;">ВЫ В ИГРЕ!<br><small>${state.myNick}</small></h2>`;
    },

    renderIdentity() {
        if (!state.myNick || state.myNick === "undefined") return;
        let idTag = document.getElementById('player-id') || document.createElement('div');
        idTag.id = 'player-id';
        idTag.className = 'player-identity';
        idTag.innerText = `Вы: ${state.myNick}`;
        if (!document.getElementById('player-id')) document.body.appendChild(idTag);
    },

    hit(idx) {
        if (!state.canHit || !state.myNick) return;
        state.canHit = false;
        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        document.getElementById('ans-grid').style.opacity = "0.3";
        db.ref('players/' + state.myNick + '/lastChoice').set(idx);

        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timerEl = document.getElementById('timer-sec');
            let timeLeft = timerEl ? parseInt(timerEl.innerText) : 0;
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
        const pinVal = document.getElementById('pin')?.value;
        if (pinVal === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
        }
    },

    async runAuto() {
        await db.ref('players/undefined').remove();
        for (let i = 0; i < QUIZ_DATA.length; i++) {
            const playersSnap = await db.ref('players').once('value');
            const updates = {};
            playersSnap.forEach(child => { updates[`players/${child.key}/lastChoice`] = -1; });
            await db.ref().update(updates);

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
        if (confirm("ПОЛНЫЙ СБРОС ВСЕГО?")) {
            db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
            localStorage.clear();
            location.reload();
        }
    }
};

// ==========================================
// 4. СИНХРОНИЗАЦИЯ ТАЙМЕРА
// ==========================================

function startSyncTimer(startTime) {
    clearInterval(state.syncTimer);
    if (!startTime) return;
    state.syncTimer = setInterval(() => {
        const elapsed = Math.floor(((Date.now() + state.serverOffset) - startTime) / 1000);
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
// 5. ЕДИНЫЙ СЛУШАТЕЛЬ СОСТОЯНИЙ
// ==========================================

db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    state.currentQIdx = g.qIdx;

    if (!state.myNick && g.step !== 'lobby') { User.join(); }

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

// Слушатель игроков
db.ref('players').on('value', snap => {
    const pData = snap.val() || {};
    if (pData.undefined) db.ref('players/undefined').remove();

    const allPlayersEntries = Object.entries(pData).filter(([name]) => name !== "undefined");
    const sortedPlayers = [...allPlayersEntries].sort((a, b) => b[1].score - a[1].score);
    
    const lobby = document.getElementById('player-tags');
    if (lobby) lobby.innerHTML = allPlayersEntries.map(([n]) => `<div class="tag">${n}</div>`).join('');
    
    document.getElementById('online-counter').innerText = `${allPlayersEntries.length} студентов онлайн`;

    // Статистика графиков
    let stats = [0, 0, 0, 0];
    allPlayersEntries.forEach(([_, data]) => { if (data.lastChoice >= 0) stats[data.lastChoice]++; });
    stats.forEach((count, i) => {
        const bar = document.getElementById(`bar-${i}`);
        const countTxt = document.getElementById(`count-${i}`);
        if (bar) bar.style.height = (count * 15 + 5) + "px"; 
        if (countTxt) countTxt.innerText = count;
    });

    const fullRankHtml = sortedPlayers.map(([n, d], i) => `
        <div class="podium-row ${i === 0 && d.score > 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${n}</span>
            <b>${d.score}</b>
        </div>
    `).join('') || "<div class='tag'>Ждем игроков...</div>";

    document.getElementById('round-leaderboard').innerHTML = fullRankHtml;
    document.getElementById('podium-final').innerHTML = fullRankHtml;
});

// ==========================================
// 6. ЭФФЕКТЫ
// ==========================================

function createConfetti() {
    for (let i = 0; i < 80; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = ['#ff3366','#2de2e2','#f8e71c','#7ed321','#ffffff'][Math.floor(Math.random()*5)];
        document.body.appendChild(c);
        c.animate([{ top: '-10%', transform: 'rotate(0deg)' }, { top: '110%', transform: 'rotate(720deg)' }], { duration: 2500 + Math.random() * 3000, iterations: Infinity });
    }
}

function showDonation() {
    const modal = document.getElementById('bread-modal');
    if(modal) modal.style.display = 'flex';
}

if (state.myNick && state.myNick !== "undefined") User.renderIdentity();
window.User = User; window.Admin = Admin;
