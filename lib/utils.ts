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

const NOISE_SUPPRESSION_KEY = 'gocall:noiseSuppression';

export function getNoiseSuppressionPreference(): boolean {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(NOISE_SUPPRESSION_KEY);
    return stored === null ? true : stored === 'true';
}

export function setNoiseSuppressionPreference(value: boolean) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NOISE_SUPPRESSION_KEY, String(value));
}

export function getAudioCaptureOptions() {
    const noiseSuppression = getNoiseSuppressionPreference();
    return {
        noiseSuppression,
        echoCancellation: true,
        autoGainControl: true,
        voiceIsolation: noiseSuppression,
    };
}

/**
 * Anexa (ou remove) o filtro de ruído por IA (RNNoise) na faixa de microfone já publicada.
 * Precisa ser chamado DEPOIS do microfone estar ligado — o LiveKit exige que o AudioContext
 * da sala já esteja pronto antes de aceitar um processor, o que não é garantido se o processor
 * for passado junto na hora de criar a faixa.
 */
export async function applyNoiseFilter(track: import('livekit-client').LocalAudioTrack | undefined) {
    if (!track) return;
    const noiseSuppression = getNoiseSuppressionPreference();

    if (!noiseSuppression) {
        if (track.getProcessor()) {
            await track.stopProcessor().catch(() => { });
        }
        return;
    }

    try {
        const { DenoiseTrackProcessor } = await import('@cc-livekit/denoise-plugin');
        if (!DenoiseTrackProcessor.isSupported()) return;
        if (track.getProcessor()?.name === 'denoise-filter') return;
        await track.setProcessor(new DenoiseTrackProcessor());
    } catch (err) {
        console.error('Não foi possível aplicar o filtro de ruído por IA', err);
    }
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
