/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Synthesize sound effects using the Web Audio API
export function playBeep(type: 'click' | 'valid' | 'warning' | 'alert') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    const playTone = (freq: number, duration: number, delay = 0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      
      // Gentle linear attack, exponential decay to prevent clicks
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };

    if (type === 'click') {
      return;
    } else if (type === 'valid') {
      // Rapid dual chime
      playTone(650, 0.1, 0);
      playTone(850, 0.12, 0.06);
    } else if (type === 'warning') {
      // Deeper error warning
      playTone(320, 0.22);
    } else if (type === 'alert') {
      // Intense buzzer equivalent
      playTone(400, 0.15, 0);
      playTone(400, 0.15, 0.18);
      playTone(400, 0.3, 0.36);
    }
  } catch (error) {
    console.warn("AudioContext blocked or failed: ", error);
  }
}
