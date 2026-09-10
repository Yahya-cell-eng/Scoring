/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Synthesize sound effects using the Web Audio API
export function playBeep(type: 'click' | 'valid' | 'warning' | 'alert' | 'victory' | 'gong') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    const playTone = (freq: number, duration: number, delay = 0, gainVal = 0.14, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      
      // Gentle linear attack, exponential decay to prevent clicks
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
      
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
    } else if (type === 'victory') {
      // Celebratory multi-tone fanfare: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz) chord
      playTone(523.25, 0.3, 0, 0.12, 'triangle');
      playTone(659.25, 0.3, 0.15, 0.14, 'triangle');
      playTone(783.99, 0.35, 0.30, 0.15, 'triangle');
      playTone(1046.50, 0.8, 0.45, 0.20, 'sine');
      // Bass warmth
      playTone(261.63, 0.9, 0.45, 0.15, 'sine');
    } else if (type === 'gong') {
      // Deep resonant gong
      playTone(220, 1.2, 0, 0.25, 'sine');
      playTone(440, 0.8, 0.02, 0.15, 'triangle');
      playTone(110, 1.5, 0.01, 0.20, 'sine');
    }
  } catch (error) {
    console.warn("AudioContext blocked or failed: ", error);
  }
}

export interface WinnerAnnouncementData {
  winner: 'merah' | 'biru' | 'seri' | null;
  winnerName?: string;
  winnerKontingen?: string;
  kelas?: string;
  partai?: string;
  skorMerah?: number;
  skorBiru?: number;
}

// Automatic Voice Announcement using Web Speech API with Indonesian Voice
export function announceWinnerVoice(data: WinnerAnnouncementData, onEnd?: () => void) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    // Cancel any pending speech queue to prioritize winner announcement
    window.speechSynthesis.cancel();

    let text = '';
    const partaiLabel = data.partai ? `Partai ${data.partai}. ` : '';
    const kelasLabel = data.kelas ? `Kelas ${data.kelas}. ` : '';

    if (data.winner === 'biru') {
      const athlete = data.winnerName ? `${data.winnerName}` : 'Atlet Sudut Biru';
      const kontingen = data.winnerKontingen ? `dari ${data.winnerKontingen}` : '';
      text = `Perhatian. ${partaiLabel}${kelasLabel}Pertandingan Selesai! Pemenang adalah Sudut Biru, ${athlete} ${kontingen}. Skor akhir: Biru ${data.skorBiru ?? 0}, Merah ${data.skorMerah ?? 0}.`;
    } else if (data.winner === 'merah') {
      const athlete = data.winnerName ? `${data.winnerName}` : 'Atlet Sudut Merah';
      const kontingen = data.winnerKontingen ? `dari ${data.winnerKontingen}` : '';
      text = `Perhatian. ${partaiLabel}${kelasLabel}Pertandingan Selesai! Pemenang adalah Sudut Merah, ${athlete} ${kontingen}. Skor akhir: Merah ${data.skorMerah ?? 0}, Biru ${data.skorBiru ?? 0}.`;
    } else {
      text = `Perhatian. ${partaiLabel}${kelasLabel}Pertandingan Selesai! Hasil pertandingan adalah Seri. Skor akhir sama kuat ${data.skorBiru ?? 0}.`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.95; // Slightly deliberate for clear arena broadcast
    utterance.pitch = 1.05;

    // Pick Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice = voices.find(v => 
      v.lang.startsWith('id') || 
      v.lang.includes('ID') || 
      v.name.toLowerCase().includes('indonesia') ||
      v.name.toLowerCase().includes('bahasa')
    );
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("SpeechSynthesis announcement error:", err);
    return false;
  }
}

