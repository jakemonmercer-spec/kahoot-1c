/**
 * Звуковой движок для 1С: Квиза
 * Генерирует звуки программно (Web Audio API)
 * Вес: 0кб внешних ресурсов
 */

const SoundEngine = {
    // Создание аудио-контекста
    ctx: null,

    // Инициализация (нужна, так как браузеры блокируют звук до первого клика)
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // Вспомогательный метод для создания осциллятора
    playTone(freq, type, duration, volume, decay = true) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        if (decay) {
            gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    // 1. Звук нажатия на кнопку (короткий «блип»)
    playTap() {
        this.playTone(600, 'sine', 0.1, 0.2);
    },

    // 2. Звук правильного ответа (мажорное трезвучие)
    playCorrect() {
        const now = this.ctx ? this.ctx.currentTime : 0;
        this.playTone(523.25, 'sine', 0.5, 0.2); // До
        setTimeout(() => this.playTone(659.25, 'sine', 0.5, 0.2), 100); // Ми
        setTimeout(() => this.playTone(783.99, 'sine', 0.5, 0.2), 200); // Соль
    },

    // 3. Звук ошибки (низкий диссонанс)
    playWrong() {
        this.playTone(200, 'sawtooth', 0.4, 0.2);
        this.playTone(180, 'sawtooth', 0.4, 0.2);
    },

    // 4. Звук начала игры или нового вопроса
    playStart() {
        this.playTone(400, 'triangle', 0.3, 0.3);
        setTimeout(() => this.playTone(800, 'triangle', 0.3, 0.3), 150);
    },

    // 5. Фанфары при победе (Пьедестал)
    playFanfare() {
        const fanfareNotes = [523, 523, 523, 698]; // До, До, До, Фа
        fanfareNotes.forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'square', 0.4, 0.15);
            }, i * 200);
        });
    },
    
    // 6. Тиканье таймера (когда осталось мало времени)
    playTick() {
        this.playTone(1200, 'sine', 0.05, 0.1);
    }
};

// Экспортируем для использования в game.js
window.SoundEngine = SoundEngine;
