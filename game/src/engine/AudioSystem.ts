/** Web Audio API sound effects — no external files */

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private droneNode: OscillatorNode | null = null;
  private muted = typeof localStorage !== 'undefined' && localStorage.getItem('rux_audio') === '0';
  private alarmInterval: ReturnType<typeof setInterval> | null = null;

  /** Call on first user interaction (keydown/click in App) */
  init(): void {
    if (this.ctx || this.muted) return;
    this.ctx = new AudioContext();
    this.startDrone();
  }

  private startDrone(): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    gain.gain.value = 0.012;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    this.droneNode = osc;
  }

  keyClick(): void {
    if (!this.ctx || this.muted) return;
    const buf = this.ctx.createBuffer(1, 512, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < 512; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / 512);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    gain.gain.value = 0.15;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  startOxygenAlarm(): void {
    if (!this.ctx || this.muted || this.alarmInterval) return;
    const beep = () => {
      if (!this.ctx || this.muted) return;
      for (const offset of [0, 0.15]) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + offset;
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      }
    };
    beep();
    this.alarmInterval = setInterval(beep, 3000);
  }

  stopOxygenAlarm(): void {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  successBeep(): void {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  errorBuzz(): void {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 120;
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  winFanfare(): void {
    if (!this.ctx || this.muted) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = this.ctx!.currentTime + i * 0.12;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('rux_audio', this.muted ? '0' : '1');
    if (this.muted) {
      this.stopOxygenAlarm();
      if (this.droneNode) {
        this.droneNode.stop();
        this.droneNode = null;
      }
    } else if (this.ctx) {
      this.startDrone();
    }
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  dispose(): void {
    this.stopOxygenAlarm();
    this.droneNode?.stop();
    this.ctx?.close();
  }
}

export const audioSystem = new AudioSystem();
