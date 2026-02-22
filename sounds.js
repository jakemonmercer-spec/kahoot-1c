const SoundEngine = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),

    // Генерация игрового бипа (для кнопок)
    playTap() {
        this.osc(440, 'triangle', 0.1, 0.2);
    },

    // Звук правильного ответа (мажорный аккорд)
    playCorrect() {
        this.osc(523.25, 'sine', 0.1, 0.3);
        setTimeout(() => this.osc(659.25, 'sine', 0.1, 0.3), 100);
        setTimeout(() => this.osc(783.99, 'sine', 0.1, 0.3), 200);
    },

    // Звук ошибки (диссонанс)
    playWrong() {
        this.osc(220, 'sawtooth', 0.3, 0.3);
        this.osc(233, 'sawtooth', 0.3, 0.3);
    },

    // Звук победы (фанфары)
    playWin() {
        const notes = [523, 523, 523, 698];
        notes.forEach((f, i) => {
            setTimeout(() => this.osc(f, 'square', 0.2, 0.3), i * 150);
        });
    },

    osc(freq, type, duration, vol) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start();
        o.stop(this.ctx.currentTime + duration);
    }
};
