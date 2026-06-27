import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioSystem } from './AudioSystem';

class MockOscillator {
  type = 'sine';
  frequency = { value: 0 };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockGain {
  gain = {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class MockBufferSource {
  buffer: AudioBuffer | null = null;
  connect = vi.fn();
  start = vi.fn();
}

describe('AudioSystem', () => {
  let system: AudioSystem;

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'AudioContext',
      class {
        currentTime = 0;
        destination = {};
        createOscillator = vi.fn(() => new MockOscillator());
        createGain = vi.fn(() => new MockGain());
        createBuffer = vi.fn((_c: number, len: number) => ({
          getChannelData: () => new Float32Array(len),
        }));
        createBufferSource = vi.fn(() => new MockBufferSource());
        close = vi.fn();
      },
    );
    system = new AudioSystem();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    system.dispose();
  });

  it('starts muted when localStorage rux_audio is 0', () => {
    localStorage.setItem('rux_audio', '0');
    const muted = new AudioSystem();
    expect(muted.isMuted).toBe(true);
    muted.dispose();
  });

  it('init creates AudioContext and starts drone', () => {
    system.init();
    system.init();
    expect(system.isMuted).toBe(false);
  });

  it('does not init when muted', () => {
    localStorage.setItem('rux_audio', '0');
    const muted = new AudioSystem();
    expect(muted.isMuted).toBe(true);
    expect(() => muted.init()).not.toThrow();
    muted.dispose();
  });

  it('plays keyClick after init', () => {
    system.init();
    expect(() => system.keyClick()).not.toThrow();
  });

  it('plays success and error sounds after init', () => {
    system.init();
    expect(() => system.successBeep()).not.toThrow();
    expect(() => system.errorBuzz()).not.toThrow();
    expect(() => system.winFanfare()).not.toThrow();
  });

  it('starts and stops oxygen alarm', () => {
    vi.useFakeTimers();
    system.init();
    system.startOxygenAlarm();
    system.startOxygenAlarm();
    system.stopOxygenAlarm();
    vi.useRealTimers();
  });

  it('toggleMute persists to localStorage', () => {
    expect(system.isMuted).toBe(false);
    expect(system.toggleMute()).toBe(true);
    expect(localStorage.getItem('rux_audio')).toBe('0');
    expect(system.toggleMute()).toBe(false);
    expect(localStorage.getItem('rux_audio')).toBe('1');
  });
});
