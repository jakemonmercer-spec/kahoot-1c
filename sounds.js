/**
 * ============================================================
 * ЗВУКОВОЙ ДВИЖЕК ДЛЯ ВИКТОРИНЫ 1С (LAB №6)
 * Работает без внешних MP3-файлов через синтез частот.
 * Оптимизировано для мгновенного отклика.
 * ============================================================
 */

const SoundEngine = {
    // Центральный аудио-контекст
    ctx: null,

    /**
     * Инициализация движка.
     * Браузеры блокируют звук до первого клика пользователя.
     * Эта функция вызывается при входе игрока или нажатии на PIN админа.
     */
    init() {
        try {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            // Если контекст "спит" (из-за политики браузера), будим его
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            console.log("SoundEngine: Аудио-движок запущен успешно.");
        } catch (e) {
            console.error("SoundEngine: Браузер не поддерживает Web Audio API.", e);
        }
    },

    /**
     * Универсальный метод генерации тона (Осциллятор)
     * @param {number} freq - Частота в Герцах (например, 440)
     * @param {string} type - Тип волны: 'sine', 'square', 'sawtooth', 'triangle'
     * @param {number} duration - Длительность звука в секундах
     * @param {number} vol - Громкость (0.0 до 1.0)
     * @param {boolean} fade - Плавно затухать в конце или резко обрывать
     */
    playTone(freq, type, duration, vol, fade = true) {
        // Гарантируем наличие контекста
        this.init();
        
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
        
        if (fade) {
            // Экспоненциальное затухание для естественного звучания
            gainNode.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
        }

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.start();
        oscillator.stop(this.ctx.currentTime + duration);
    },

    /**
     * 1. ЗВУК НАЖАТИЯ (TAP)
     * Короткий, мягкий звук для кнопок.
     */
    playTap() {
        this.playTone(600, 'sine', 0.1, 0.2);
    },

    /**
     * 2. ЗВУК ПРАВИЛЬНОГО ОТВЕТА (CORRECT)
     * Мажорное трезвучие (арпеджио), создающее радостный эффект.
     */
    playCorrect() {
        const now = this.ctx ? this.ctx.currentTime : 0;
        // Нота До (C5)
        this.playTone(523.25, 'sine', 0.4, 0.15); 
        // Нота Ми (E5) через 100мс
        setTimeout(() => this.playTone(659.25, 'sine', 0.4, 0.15), 100); 
        // Нота Соль (G5) через 200мс
        setTimeout(() => this.playTone(783.99, 'sine', 0.5, 0.15), 200); 
    },

    /**
     * 3. ЗВУК ОШИБКИ (WRONG)
     * Низкий, резкий диссонанс для уведомления о неверном выборе.
     */
    playWrong() {
        // Два осциллятора с близкой частотой создают "биение" (неприятный звук)
        this.playTone(180, 'sawtooth', 0.3, 0.2);
        this.playTone(175, 'sawtooth', 0.3, 0.2);
    },

    /**
     * 4. ЗВУК НАЧАЛА (START)
     * Восходящий тон для привлечения внимания при запуске вопроса.
     */
    playStart() {
        this.playTone(300, 'triangle', 0.2, 0.3);
        setTimeout(() => this.playTone(600, 'triangle', 0.4, 0.3), 150);
    },

    /**
     * 5. ТИКАНИЕ ТАЙМЕРА (TICK)
     * Короткий щелчок для последних секунд.
     */
    playTick() {
        this.playTone(1000, 'sine', 0.05, 0.08, false);
    },

    /**
     * 6. ФАНФАРЫ ПОБЕДИТЕЛЯ (FANFARE)
     * Звучит на финальном подиуме вместе с конфетти.
     */
    playFanfare() {
        const melody = [
            {f: 523.25, d: 0.2}, // До
            {f: 523.25, d: 0.2}, // До
            {f: 523.25, d: 0.2}, // До
            {f: 698.46, d: 0.6}, // Фа (победная)
            {f: 880.00, d: 0.8}  // Ля
        ];

        melody.forEach((note, i) => {
            setTimeout(() => {
                this.playTone(note.f, 'square', note.d, 0.1);
            }, i * 200);
        });
    },

    /**
     * 7. ЗВУК СБРОСА (RESET)
     * Нисходящий "улетающий" звук при очистке системы.
     */
    playReset() {
        this.playTone(800, 'sine', 0.5, 0.2);
        setTimeout(() => this.playTone(400, 'sine', 0.5, 0.1), 100);
    }
};

// Делаем объект доступным глобально для game.js
window.SoundEngine = SoundEngine;
