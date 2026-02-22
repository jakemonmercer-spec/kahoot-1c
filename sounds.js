const SoundEngine = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    playTone(freq, type, duration, volume, decay = true) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        if (decay) gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playTap() { this.playTone(600, 'sine', 0.1, 0.2); },
    playCorrect() {
        this.playTone(523, 'sine', 0.5, 0.2);
        setTimeout(() => this.playTone(659, 'sine', 0.5, 0.2), 100);
        setTimeout(() => this.playTone(783, 'sine', 0.5, 0.2), 200);
    },
    playWrong() {
        this.playTone(200, 'sawtooth', 0.4, 0.2);
        this.playTone(180, 'sawtooth', 0.4, 0.2);
    },
    playTick() { this.playTone(1200, 'sine', 0.05, 0.1); },
    playFanfare() {
        [523, 523, 523, 698].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'square', 0.4, 0.15), i * 200);
        });
    }
};
window.SoundEngine = SoundEngine;
