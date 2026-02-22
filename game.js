/**
 * ГЛАВНАЯ ЛОГИКА QUIZ 1C
 * Обработка игроков, синхронизация с Firebase и авто-пилот
 */

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

const ANIMAL_NAMES = [
    "Мудрый Кот", "Быстрый Гепард", "Сонная Панда", "Грозный Тигр", "Хитрый Лис", 
    "Смелый Лев", "Тихий Волк", "Веселый Енот", "Гордый Орел", "Умный Сова",
    "Яркий Попугай", "Добрый Слон", "Ловкий Мангуст", "Крутой Бобер", "Синий Кит",
    "Золотой Олень", "Снежный Барс", "Дикий Кабан", "Вольный Конь", "Лесной Олень"
];

let state = {
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    syncTimer: null,
    serverOffset: 0
};

// Смещение времени сервера
db.ref('.info/serverTimeOffset').on('value', snap => {
    state.serverOffset = snap.val() || 0;
});

const User = {
    // Генерация случайного имени
    generateRandomNick() {
        const animal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
        const num = Math.floor(Math.random() * 900) + 100;
        return `${animal} #${num}`;
    },

    // Вход в игру (автоматический или ручной)
    async join(manualName = null) {
        if (typeof SoundEngine !== 'undefined') SoundEngine.init();

        // Если имя не передано вручную и его нет в памяти - генерируем
        if (!manualName && !state.myNick) {
            state.myNick = this.generateRandomNick();
        } else if (manualName) {
            state.myNick = manualName;
        }

        if (!state.myNick || state.myNick === "undefined") {
            state.myNick = this.generateRandomNick();
        }

        localStorage.setItem('quiz_nick', state.myNick);

        // Регистрация в Firebase
        const playerRef = db.ref('players/' + state.myNick);
        await playerRef.update({
            score: 0,
            lastChoice: -1,
            lastActive: firebase.database.ServerValue.TIMESTAMP
        });

        // Удаление при выходе
        playerRef.onDisconnect().remove();

        this.renderIdentity();
        console.log("User joined as:", state.myNick);

        // Визуальное обновление если мы в лобби
        const joinCard = document.getElementById('join-card');
        if (joinCard && manualName) {
            joinCard.innerHTML = `<h2 style="color:#333; font-weight:900;">ВЫ В ИГРЕ!<br><small style="color:#46178f">${state.myNick}</small></h2>`;
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
        
        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        const grid = document.getElementById('ans-grid');
        if (grid) grid.style.opacity = "0.3";

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
    },

    logout() {
        localStorage.removeItem('quiz_nick');
        location.reload();
    }
};

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
        if (!confirm("Запустить автоматический цикл игры?")) return;
        
        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // Сброс выбора игроков перед вопросом
            const playersSnap = await db.ref('players').once('value');
            const updates = {};
            playersSnap.forEach(snap => { updates[`players/${snap.key}/lastChoice`] = -1; });
            if (Object.keys(updates).length > 0) await db.ref().update(updates);

            await db.ref('game').set({ step: 'getready', qIdx: i, serverStartTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 4000));

            await db.ref('game').update({ step: 'game', serverStartTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 21000));

            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 7000));
        }
        db.ref('game').update({ step: 'podium' });
    },

    async reset() {
        if (!confirm("ГЛОБАЛЬНЫЙ СБРОС: Все игроки будут переименованы, база очищена!")) return;
        await db.ref('game/step').set('reset-signal');
        setTimeout(async () => {
            await db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
            localStorage.removeItem('quiz_nick');
            location.reload();
        }, 500);
    }
};

// Таймер
function startSyncTimer(startTime) {
    clearInterval(state.syncTimer);
    state.syncTimer = setInterval(() => {
        const now = Date.now() + state.serverOffset;
        const elapsed = Math.floor((now - startTime) / 1000);
        let left = 20 - elapsed;
        if (left < 0) left = 0;

        const el = document.getElementById('timer-sec');
        if (el) {
            el.innerText = left;
            if (left <= 5 && left > 0) SoundEngine.playTick();
            if (left === 0) {
                state.canHit = false;
                if (document.getElementById('ans-grid')) document.getElementById('ans-grid').style.opacity = "0.3";
                clearInterval(state.syncTimer);
            }
        }
    }, 1000);
}

// Синхронизация состояния игры
db.ref('game').on('value', snap => {
    const g = snap.val() || {};
    
    if (g.step === 'reset-signal') {
        localStorage.removeItem('quiz_nick');
        location.reload();
        return;
    }

    state.currentQIdx = g.qIdx;
    
    // Скрытие/Показ экранов
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + g.step);
    if (target) target.classList.add('active');

    if (g.step === 'game') {
        state.canHit = true;
        if (document.getElementById('ans-grid')) document.getElementById('ans-grid').style.opacity = "1";
        const q = QUIZ_DATA[g.qIdx];
        if (q) {
            document.getElementById('q-text').innerText = q.q;
            const btns = document.querySelectorAll('.ans-btn .t');
            q.a.forEach((text, i) => { if (btns[i]) btns[i].innerText = text; });
        }
        startSyncTimer(g.serverStartTime);
    }

    if (g.step === 'podium') {
        if (typeof createConfetti === 'function') createConfetti();
        if (typeof SoundEngine !== 'undefined') SoundEngine.playFanfare();
    }
});

// Синхронизация списка игроков (Лобби и Рейтинг)
db.ref('players').on('value', snap => {
    const players = snap.val() || {};
    const entries = Object.entries(players).filter(([name]) => name !== "undefined");
    const sorted = [...entries].sort((a, b) => b[1].score - a[1].score);

    // 1. Счетчик онлайн
    const counter = document.getElementById('online-counter');
    if (counter) counter.innerText = `В игре: ${entries.length} участников`;

    // 2. Облако тегов в лобби
    const lobbyList = document.getElementById('player-tags');
    if (lobbyList) {
        lobbyList.innerHTML = entries.map(([name]) => `<div class="tag">${name}</div>`).join('');
    }

    // 3. Статистика ответов (графики)
    let stats = [0, 0, 0, 0];
    entries.forEach(([_, data]) => {
        if (data.lastChoice >= 0) stats[data.lastChoice]++;
    });
    stats.forEach((count, i) => {
        const bar = document.getElementById(`bar-${i}`);
        const txt = document.getElementById(`count-${i}`);
        if (bar) bar.style.height = (count * 25 + 5) + "px";
        if (txt) txt.innerText = count;
    });

    // 4. Рейтинговые списки
    const listHtml = sorted.map(([name, data], i) => `
        <div class="podium-row ${i === 0 && data.score > 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${name}</span>
            <b>${data.score}</b>
        </div>
    `).join('');

    const leaderBoard = document.getElementById('round-leaderboard');
    if (leaderBoard) leaderBoard.innerHTML = listHtml || "Ожидание ответов...";

    const finalBoard = document.getElementById('podium-final');
    if (finalBoard) finalBoard.innerHTML = listHtml || "Никто не дошел до финала";

    // 5. Счетчик полученных ответов
    const ansCount = document.getElementById('ans-count');
    if (ansCount) ansCount.innerText = entries.filter(([_, d]) => d.lastChoice >= 0).length;
});

// Конфетти для финала
function createConfetti() {
    for (let i = 0; i < 50; i++) {
        const div = document.createElement('div');
        div.className = 'confetti';
        div.style.left = Math.random() * 100 + 'vw';
        div.style.backgroundColor = ['#ff0', '#f0f', '#0ff', '#0f0'][Math.floor(Math.random() * 4)];
        document.body.appendChild(div);
        div.animate([{top: '-10%'}, {top: '100%'}], {duration: Math.random() * 3000 + 2000, iterations: Infinity});
    }
}

// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
window.onload = () => {
    // Автоматический вход если ника нет
    User.join();
    
    // Кнопка входа для тех, кто хочет сменить имя вручную в лобби
    window.handleJoinBtn = () => {
        const input = document.getElementById('p-nick');
        if (input && input.value.trim()) {
            User.join(input.value.trim());
        } else {
            alert("Введите имя или играйте под случайным!");
        }
    };
};

window.User = User;
window.Admin = Admin;
