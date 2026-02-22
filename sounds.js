const SoundEngine = {
    ctx: null,

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    playTap() { this.osc(440, 'triangle', 0.1, 0.2); },
    playCorrect() {
        this.osc(523.25, 'sine', 0.1, 0.3);
        setTimeout(() => this.osc(659.25, 'sine', 0.1, 0.3), 100);
    },
    playWrong() { this.osc(220, 'sawtooth', 0.3, 0.3); },
    playTick() { this.osc(880, 'sine', 0.05, 0.1); },
    playFanfare() {
        [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => this.osc(f, 'square', 0.4, 0.2), i * 150));
    },

    osc(freq, type, duration, vol) {
        if (!this.ctx) return;
        try {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = type;
            o.frequency.setValueAtTime(freq, this.ctx.currentTime);
            g.gain.setValueAtTime(vol, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
            o.connect(g);
            g.connect(this.ctx.destination);
            o.start();
            o.stop(this.ctx.currentTime + duration);
        } catch (e) { console.error("Audio error", e); }
    }
};
