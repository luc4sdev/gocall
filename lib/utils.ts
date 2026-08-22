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

type SoundType = 'join' | 'leave' | 'mute' | 'unmute' | 'deafen' | 'undeafen' | 'screenshare-start' | 'screenshare-stop';

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
            case 'screenshare-start':
                playTone(ctx, 440, now, 0.08, { peakGain: 0.11 });
                playTone(ctx, 554.37, now + 0.07, 0.08, { peakGain: 0.11 });
                playTone(ctx, 659.25, now + 0.14, 0.16, { peakGain: 0.11 });
                break;
            case 'screenshare-stop':
                playTone(ctx, 554.37, now, 0.08, { peakGain: 0.1 });
                playTone(ctx, 415.3, now + 0.07, 0.18, { peakGain: 0.1 });
                break;
        }

        const closeAfter = type === 'join' || type === 'leave' || type === 'screenshare-start' ? 500 : 300;
        setTimeout(() => ctx.close().catch(() => {}), closeAfter);
    } catch {
        console.error("Áudio bloqueado pelo navegador");
    }
}
