import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { LocalAudioTrack, Track, type AudioCaptureOptions, type LocalParticipant } from "livekit-client"

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

const ADVANCED_NOISE_SUPPRESSION_KEY = 'gocall:advancedNoiseSuppression';

export const ADVANCED_NOISE_SUPPRESSION_CHANGE_EVENT = 'gocall:advanced-noise-suppression-change';

export function getAdvancedNoiseSuppressionPreference(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(ADVANCED_NOISE_SUPPRESSION_KEY) === 'true';
}

export function setAdvancedNoiseSuppressionPreference(value: boolean) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ADVANCED_NOISE_SUPPRESSION_KEY, String(value));
    window.dispatchEvent(new Event(ADVANCED_NOISE_SUPPRESSION_CHANGE_EVENT));
}

const AUDIO_INPUT_DEVICE_KEY = 'gocall:audioInputDeviceId';
const AUDIO_OUTPUT_DEVICE_KEY = 'gocall:audioOutputDeviceId';

export const AUDIO_DEVICE_CHANGE_EVENT = 'gocall:audio-device-change';

export interface AudioDeviceChangeDetail {
    kind: 'audioinput' | 'audiooutput';
    deviceId: string;
}

export function getAudioInputDevicePreference(): string {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(AUDIO_INPUT_DEVICE_KEY) ?? '';
}

export function setAudioInputDevicePreference(deviceId: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AUDIO_INPUT_DEVICE_KEY, deviceId);
    window.dispatchEvent(new CustomEvent<AudioDeviceChangeDetail>(AUDIO_DEVICE_CHANGE_EVENT, {
        detail: { kind: 'audioinput', deviceId },
    }));
}

export function getAudioOutputDevicePreference(): string {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(AUDIO_OUTPUT_DEVICE_KEY) ?? '';
}

export function setAudioOutputDevicePreference(deviceId: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AUDIO_OUTPUT_DEVICE_KEY, deviceId);
    window.dispatchEvent(new CustomEvent<AudioDeviceChangeDetail>(AUDIO_DEVICE_CHANGE_EVENT, {
        detail: { kind: 'audiooutput', deviceId },
    }));
}

export async function getAudioCaptureOptions(): Promise<AudioCaptureOptions> {
    const deviceId = getAudioInputDevicePreference();
    let noiseSuppression = getNoiseSuppressionPreference();
    let processor: AudioCaptureOptions['processor'];

    if (getAdvancedNoiseSuppressionPreference()) {
        processor = await createAdvancedNoiseSuppressionProcessor();
        if (processor) noiseSuppression = false;
    }

    return {
        noiseSuppression,
        echoCancellation: true,
        autoGainControl: true,
        voiceIsolation: noiseSuppression,
        ...(deviceId ? { deviceId } : {}),
        ...(processor ? { processor } : {}),
    };
}

export async function createAdvancedNoiseSuppressionProcessor(): Promise<AudioCaptureOptions['processor'] | undefined> {
    try {
        const { DenoiseTrackProcessor } = await import('@cc-livekit/denoise-plugin');
        if (DenoiseTrackProcessor.isSupported()) {
            return new DenoiseTrackProcessor();
        }
        console.warn('Supressão de ruído avançada não é suportada neste navegador.');
    } catch (err) {
        console.error('Não foi possível carregar a supressão de ruído avançada:', err);
    }
    return undefined;
}

export async function enableMicrophone(localParticipant: LocalParticipant): Promise<{ advancedSuppressionActive: boolean }> {
    const options = await getAudioCaptureOptions();
    try {
        await localParticipant.setMicrophoneEnabled(true, options);
        return { advancedSuppressionActive: !!options.processor };
    } catch (err) {
        if (!options.processor) throw err;
        console.error('Falha ao ativar o microfone com a supressão avançada, tentando sem ela:', err);
        await localParticipant.setMicrophoneEnabled(true, { ...options, processor: undefined });
        return { advancedSuppressionActive: false };
    }
}

export async function applyAdvancedNoiseSuppressionToMicrophone(localParticipant: LocalParticipant): Promise<boolean> {
    const track = localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
    if (!(track instanceof LocalAudioTrack)) return false;

    if (!getAdvancedNoiseSuppressionPreference()) {
        await track.stopProcessor().catch(console.error);
        return false;
    }

    const processor = await createAdvancedNoiseSuppressionProcessor();
    if (!processor) return false;
    try {
        await track.setProcessor(processor);
        return true;
    } catch (err) {
        console.error('Não foi possível ativar a supressão avançada:', err);
        return false;
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

export function playSound(type: SoundType) {
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
