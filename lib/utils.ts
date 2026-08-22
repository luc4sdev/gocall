import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

declare global {
    interface Window {
        webkitAudioContext?: typeof AudioContext;
    }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const USERNAME_STORAGE_KEY = 'gocall-username';

export function getStoredUsername() {
    const fallback = `User_${Math.floor(Math.random() * 1000)}`;
    if (typeof window === 'undefined') return fallback;

    const stored = window.localStorage.getItem(USERNAME_STORAGE_KEY);
    if (stored) return stored;

    const entered = window.prompt('Como você quer ser chamado no GoCall?', '')?.trim();
    const resolved = entered || fallback;
    window.localStorage.setItem(USERNAME_STORAGE_KEY, resolved);
    return resolved;
}

type SoundType = 'join' | 'leave' | 'mute' | 'unmute' | 'deafen' | 'undeafen';

function playTone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    { type = 'sine', peakGain = 0.12 }: { type?: OscillatorType; peakGain?: number } = {}
) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
}

export function playDiscordSound(type: SoundType) {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        switch (type) {
            case 'join':
                playTone(ctx, 523.25, now, 0.12);
                playTone(ctx, 783.99, now + 0.09, 0.18);
                break;
            case 'leave':
                playTone(ctx, 622.25, now, 0.1);
                playTone(ctx, 415.3, now + 0.08, 0.2);
                break;
            case 'mute':
                playTone(ctx, 340, now, 0.09, { type: 'triangle', peakGain: 0.1 });
                break;
            case 'unmute':
                playTone(ctx, 340, now, 0.06, { type: 'triangle', peakGain: 0.1 });
                playTone(ctx, 540, now + 0.05, 0.08, { type: 'triangle', peakGain: 0.1 });
                break;
            case 'deafen':
                playTone(ctx, 300, now, 0.07, { type: 'triangle', peakGain: 0.09 });
                playTone(ctx, 190, now + 0.05, 0.14, { type: 'triangle', peakGain: 0.09 });
                break;
            case 'undeafen':
                playTone(ctx, 420, now, 0.06, { type: 'triangle', peakGain: 0.09 });
                playTone(ctx, 600, now + 0.05, 0.1, { type: 'triangle', peakGain: 0.09 });
                break;
        }

        const closeAfter = type === 'join' || type === 'leave' ? 500 : 300;
        setTimeout(() => ctx.close().catch(() => {}), closeAfter);
    } catch {
        console.error("Áudio bloqueado pelo navegador");
    }
}
