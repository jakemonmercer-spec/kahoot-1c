// ==========================================
// 1. КОНФИГ И СОСТОЯНИЕ
// ==========================================
const QUIZ_DATA = [
    { q: "Для чего предназначен объект конфигурации «Отчет»?", a: ["Для хранения паролей", "Для анализа данных", "Для ввода сотрудников", "Для удаления базы"], c: 1 },
    { q: "Как создать отчет без написания кода?", a: ["Через Модуль", "Использовать Макет", "Через СКД", "В блокноте"], c: 2 },
    { q: "Что такое виртуальная таблица «ОстаткиИОбороты»?", a: ["Список картинок", "Приход, расход и остатки", "Архив документов", "Чат"], c: 1 },
    { q: "Какие поля важны для отчета «Материалы»?", a: ["Цвет и Размер", "Склад, Материал, Остатки", "Имя директора", "Адрес"], c: 1 },
    { q: "Для чего нужны параметры «Начало/Конец периода»?", a: ["Для красоты", "Задать временной период", "Регистрация", "Ускорение"], c: 1 },
    { q: "Как вывести команду отчета в меню?", a: ["Ярлык", "Вкладка «Подсистемы»", "Поддержка", "Сохранить файл"], c: 1 },
    { q: "Кнопка в 1С для вывода данных на экран?", a: ["«Сформировать»", "«Пуск»", "«Записать»", "«Провести»"], c: 0 },
    { q: "Компания-разработчик 1С?", a: ["1С", "Microsoft", "Oracle", "SAP"], c: 0 },
    { q: "Фирменный цвет 1С?", a: ["Синий", "Желтый", "Зеленый", "Черный"], c: 1 },
    { q: "Режим для написания кода в 1С?", a: ["Пользовательский", "Конфигуратор", "Отладка", "Браузер"], c: 1 },
    { q: "Объект для хранения списков (товары)?", a: ["Справочник", "Документ", "Отчет", "Константа"], c: 0 },
    { q: "Объект, фиксирующий продажу?", a: ["Регистр", "Документ", "Макет", "План счетов"], c: 1 }
];

const state = {
    uid: localStorage.getItem('quiz_uid') || 'u' + Math.random().toString(36).substr(2, 9),
    myNick: localStorage.getItem('quiz_nick') || "",
    currentQIdx: -1,
    canHit: false,
    syncTimer: null,
    serverOffset: 0
};
localStorage.setItem('quiz_uid', state.uid);

// Синхронизация времени с Firebase
db.ref('.info/serverTimeOffset').on('value', s => state.serverOffset = s.val() || 0);

// ==========================================
// 2. ЛОГИКА ПОЛЬЗОВАТЕЛЯ
// ==========================================
window.User = {
    async join() {
        if (typeof SoundEngine !== 'undefined') SoundEngine.init();
        
        let name = document.getElementById('p-nick')?.value.trim();
        if (!name) name = "Студент_" + state.uid.substr(-3);
        
        state.myNick = name;
        localStorage.setItem('quiz_nick', name);

        await db.ref(`players/${state.uid}`).update({
            name: name,
            score: 0,
            lastChoice: -1,
            active: true
        });
        
        db.ref(`players/${state.uid}`).onDisconnect().update({ active: false });
        this.renderIdentity();
        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();
        
        const card = document.getElementById('join-card');
        if (card) card.innerHTML = `<h3>Вы в игре, ${name}!</h3>`;
    },

    renderIdentity() {
        if (!state.myNick) return;
        let el = document.getElementById('player-id-tag');
        if (!el) {
            el = document.createElement('div');
            el.id = 'player-id-tag';
            el.className = 'player-identity';
            document.body.appendChild(el);
        }
        el.innerText = `👤 ${state.myNick}`;
    },

    async hit(idx) {
        if (!state.canHit) return;
        state.canHit = false;
        
        document.getElementById('ans-grid').style.opacity = "0.3";
        if (typeof SoundEngine !== 'undefined') SoundEngine.playTap();

        await db.ref(`players/${state.uid}/lastChoice`).set(idx);

        if (idx === QUIZ_DATA[state.currentQIdx]?.c) {
            const timeLeft = parseInt(document.getElementById('timer-sec').innerText) || 0;
            const points = 500 + (timeLeft * 25);
            db.ref(`players/${state.uid}/score`).transaction(s => (s || 0) + points);
            if (typeof SoundEngine !== 'undefined') SoundEngine.playCorrect();
        } else {
            if (typeof SoundEngine !== 'undefined') SoundEngine.playWrong();
        }
    }
};

// ==========================================
// 3. ЛОГИКА АДМИНА (ТЕПЕРЬ ВСЕ МЕТОДЫ ЕСТЬ)
// ==========================================
window.Admin = {
    login() {
        const pin = document.getElementById('pin').value;
        if (pin === "123") {
            document.getElementById('auth-lock').style.display = 'none';
            document.getElementById('adm-tools').style.display = 'flex';
        } else {
            alert("Wrong PIN");
        }
    },

    // Метод переключения шагов вручную
    setStep(step) {
        db.ref('game').update({ step: step });
    },

    // Сброс всей системы
    reset() {
        if (confirm("УДАЛИТЬ ВСЕ ДАННЫЕ ИГРОКОВ?")) {
            db.ref('/').set({
                game: { step: 'lobby', qIdx: -1 },
                players: {}
            });
            localStorage.clear();
            location.reload();
        }
    },

    async runAuto() {
        if (!confirm("Начать автоматический цикл?")) return;
        
        for (let i = 0; i < QUIZ_DATA.length; i++) {
            // Очистка выборов перед вопросом
            const snap = await db.ref('players').once('value');
            const updates = {};
            snap.forEach(p => updates[`players/${p.key}/lastChoice`] = -1);
            await db.ref().update(updates);

            // 1. Приготовьтесь
            await db.ref('game').set({ step: 'getready', qIdx: i, startTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 4000));

            // 2. Вопрос
            await db.ref('game').update({ step: 'game', startTime: firebase.database.ServerValue.TIMESTAMP });
            await new Promise(r => setTimeout(r, 21000));

            // 3. Результаты
            await db.ref('game').update({ step: 'results' });
            await new Promise(r => setTimeout(r, 7000));
        }
        db.ref('game').update({ step: 'podium' });
    }
};

// ==========================================
// 4. СИНХРОНИЗАЦИЯ И ТАЙМЕР
// ==========================================
function startTimer(start) {
    clearInterval(state.syncTimer);
    state.syncTimer = setInterval(() => {
        const now = Date.now() + state.serverOffset;
        let left = 20 - Math.floor((now - start) / 1000);
        if (left < 0) left = 0;
        
        const el = document.getElementById('timer-sec');
        if (el) el.innerText = left;
        
        if (left <= 5 && left > 0 && typeof SoundEngine !== 'undefined') SoundEngine.playTick();
        if (left === 0) {
            state.canHit = false;
            const grid = document.getElementById('ans-grid');
            if (grid) grid.style.opacity = "0.3";
            clearInterval(state.syncTimer);
        }
    }, 1000);
}

// Слушатель состояния игры
db.ref('game').on('value', snap => {
    const g = snap.val() || { step: 'lobby', qIdx: -1 };
    state.currentQIdx = g.qIdx;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + g.step);
    if (target) target.classList.add('active');

    if (g.step === 'game') {
        state.canHit = true;
        const grid = document.getElementById('ans-grid');
        if (grid) grid.style.opacity = "1";
        
        const q = QUIZ_DATA[g.qIdx];
        if (q) {
            document.getElementById('q-text').innerText = q.q;
            const btns = document.querySelectorAll('.ans-btn .t');
            q.a.forEach((txt, i) => { if (btns[i]) btns[i].innerText = txt; });
        }
        startTimer(g.startTime);
    }
    
    if (g.step === 'podium' && typeof SoundEngine !== 'undefined') {
        SoundEngine.playFanfare();
    }
});

// Слушатель игроков
db.ref('players').on('value', snap => {
    const data = snap.val() || {};
    const players = Object.values(data);
    const sorted = [...players].sort((a, b) => b.score - a.score);

    // Лобби
    const lobby = document.getElementById('player-tags');
    if (lobby) lobby.innerHTML = players.map(p => `<div class="tag">${p.name}</div>`).join('');
    
    const counter = document.getElementById('online-counter');
    if (counter) counter.innerText = `Подключено: ${players.length}`;

    // Статистика ответов
    let stats = [0, 0, 0, 0];
    players.forEach(p => { if (p.lastChoice >= 0) stats[p.lastChoice]++ });
    stats.forEach((c, i) => {
        const bar = document.getElementById(`bar-${i}`);
        if (bar) bar.style.height = (c * 25 + 5) + "px";
        const txt = document.getElementById(`count-${i}`);
        if (txt) txt.innerText = c;
    });

    // Рейтинг
    const html = sorted.map((p, i) => `
        <div class="podium-row ${i === 0 ? 'place-1' : ''}">
            <span>${i+1}. ${p.name}</span>
            <b>${p.score}</b>
        </div>
    `).join('');
    
    const rb = document.getElementById('round-leaderboard');
    if (rb) rb.innerHTML = html;
    const pf = document.getElementById('podium-final');
    if (pf) pf.innerHTML = html;

    const ansCount = document.getElementById('ans-count');
    if (ansCount) ansCount.innerText = players.filter(p => p.lastChoice >= 0).length;
});

// Восстановление ника
if (state.myNick) User.renderIdentity();
