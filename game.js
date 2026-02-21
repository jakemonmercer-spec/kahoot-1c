// 1. ДАННЫЕ
const QUIZ_DATA = [
    { q: "Для чего предназначен объект 'Отчет' в 1С?", a: ["Для ввода данных", "Для анализа и вывода сводной информации", "Для хранения списка сотрудников", "Для удаления записей"], c: 1 },
    { q: "Какой инструмент используется в 6-й лабе для создания отчета без кода?", a: ["Макет оформления", "Конструктор форм", "СКД (Система компоновки данных) ", "Модуль объекта"], c: 2 },
    { q: "Какую виртуальную таблицу мы выбрали в Конструкторе запроса?", a: ["Остатки", "Обороты", "ОстаткиИОбороты", "Продажи"], c: 2 },
    { q: "Зачем в настройках СКД нужны 'Детальные записи'?", a: ["Чтобы скрыть итоги", "Для вывода подробных строк (Склад, Товар)", "Для защиты отчета", "Это ошибка"], c: 1 },
    { q: "Что позволяет пользователю менять даты отчета в режиме '1С:Предприятие'?", a: ["Параметры в 'Пользовательских настройках'", "Длина кода справочника", "Имя подсистемы", "Кнопка СБРОС"], c: 0 }
];

const ANIMAL_NAMES = ["Мудрый Кот", "Быстрарый Гепард", "Сонная Панда", "Грозный Тигр", "Хитрый Лис", "Смелый Лев", "Тихий Волк", "Веселый Енот", "Гордый Орел", "Умный Сова"];

let state = {
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    syncTimer: null
};

// --- ЛОГИКА ИГРОКА ---
const User = {
    async join() {
        SoundEngine.init();
        let input = document.getElementById('p-nick').value.trim();
        
        // Защита от пустого имени и undefined
        if (!input && !state.myNick) {
            input = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
        }
        
        state.myNick = input || state.myNick;
        if (state.myNick === "undefined" || !state.myNick) return; // Жесткий стоп

        localStorage.setItem('quiz_nick', state.myNick);

        const playerRef = db.ref('players/' + state.myNick);
        await playerRef.update({ score: 0, lastActive: Date.now() });
        
        // Авто-удаление при дисконнекте
        playerRef.onDisconnect().remove();

        SoundEngine.playTap();
        this.renderIdentity();
        document.getElementById('join-card').innerHTML = `<h2 style="color:#333">Вы в игре, ${state.myNick}!</h2>`;
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
        // Если ника нет — запрещаем клик (защита от ghost player)
        if (!state.canHit || !state.myNick || state.myNick === "undefined") return;
        
        state.canHit = false;
        SoundEngine.playTap();
        document.getElementById('ans-grid').style.opacity = "0.3";

        if (idx === QUIZ_DATA[state.currentQIdx].c) {
            let timeLeft = parseInt(document.getElementById('timer-sec').innerText);
            let points = 500 + (timeLeft * 25);
            db.ref('players/' + state.myNick + '/score').transaction(s => (s || 0) + points);
            SoundEngine.playCorrect();
        } else {
            SoundEngine.playWrong();
        }
    }
};

// --- ЛОГИКА АДМИНА ---
const Admin = {
    login() {
        if (document.getElementById('pin').value === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
        }
    },

    async runAuto() {
        // При запуске очищаем старые призраки undefined из базы
        await db.ref('players/undefined').remove();

        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // Устанавливаем время начала вопроса по серверу
            await db.ref('game').update({ 
                step: 'getready', 
                qIdx: i, 
                serverStartTime: firebase.database.ServerValue.TIMESTAMP 
            });
            await new Promise(r => setTimeout(r, 3000));

            await db.ref('game').update({ 
                step: 'game',
                serverStartTime: firebase.database.ServerValue.TIMESTAMP 
            });
            await new Promise(r => setTimeout(r, 20500));

            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 5000));
        }
        db.ref('game').update({ step: 'podium' });
    },

    reset() {
        if (confirm("Полный сброс базы?")) {
            db.ref('/').set({ game: { step: 'lobby', qIdx: -1 }, players: {} });
            localStorage.clear();
            location.reload();
        }
    }
};

// --- СИНХРОНИЗАЦИЯ ТАЙМЕРА (Серверное время) ---
function syncTimer(serverStart) {
    clearInterval(state.syncTimer);
    
    // Получаем смещение времени сервера относительно телефона
    db.ref('.info/serverTimeOffset').once('value', (snap) => {
        const offset = snap.val();
        
        state.syncTimer = setInterval(() => {
            const nowServer = Date.now() + offset;
            const elapsed = Math.floor((nowServer - serverStart) / 1000);
            let left = 20 - elapsed;

            if (left < 0) left = 0;
            
            const timerEl = document.getElementById('timer-sec');
            if (timerEl) {
                timerEl.innerText = left;
                if (left <= 5 && left > 0) SoundEngine.playTick();
                if (left === 0) {
                    state.canHit = false;
                    document.getElementById('ans-grid').style.opacity = "0.3";
                    clearInterval(state.syncTimer);
                }
            }
        }, 1000);
    });
}

// --- СЛУШАТЕЛИ FIREBASE ---
db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    state.currentQIdx = g.qIdx;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + g.step);
    if (target) target.classList.add('active');

    if (g.step === 'game') {
        state.canHit = true;
        document.getElementById('ans-grid').style.opacity = "1";
        const q = QUIZ_DATA[state.currentQIdx];
        document.getElementById('q-text').innerText = q.q;
        const btns = document.querySelectorAll('.ans-btn .t');
        q.a.forEach((t, i) => { if (btns[i]) btns[i].innerText = t; });
        
        // Запуск синхронного таймера
        syncTimer(g.serverStartTime);
    }
    
    if (g.step === 'podium') {
        SoundEngine.playFanfare();
        createConfetti();
    }
});

db.ref('players').on('value', snap => {
    const p = snap.val() || {};
    // Удаляем из локального отображения игрока undefined, если он пролез
    if (p.undefined) delete p.undefined;

    const sorted = Object.entries(p).sort((a, b) => b[1].score - a[1].score);
    
    document.getElementById('player-tags').innerHTML = sorted.map(([n]) => `<div class="tag">${n}</div>`).join('');
    document.getElementById('online-counter').innerText = `${Object.keys(p).length} игроков онлайн`;

    const listHtml = sorted.slice(0, 5).map(([n, d], i) => `
        <div class="winner-row ${i === 0 ? 'place-1' : ''}">
            <span>${i + 1}. ${n}</span>
            <b>${d.score}</b>
        </div>
    `).join('');
    
    document.getElementById('round-leaderboard').innerHTML = listHtml;
    document.getElementById('podium-final').innerHTML = listHtml;
});

function createConfetti() {
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = ['#ff0','#f0f','#0ff','#0f0'][Math.floor(Math.random()*4)];
        document.body.appendChild(c);
        c.animate([{ top: '-10%' }, { top: '110%' }], { duration: 3000, iterations: Infinity });
    }
}

if (state.myNick && state.myNick !== "undefined") User.renderIdentity();
