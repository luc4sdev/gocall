import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { LocalAudioTrack, Track, type AudioCaptureOptions, type LocalParticipant } from "livekit-client"
import { MicGainProcessor } from "./micGainProcessor"

declare global {
    interface Window {
        webkitAudioContext?: typeof AudioContext;
    }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function buildDmKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(':')
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


const MIC_GAIN_KEY = 'gocall:micGain';
export const MIC_GAIN_CHANGE_EVENT = 'gocall:mic-gain-change';
export const DEFAULT_MIC_GAIN = 100;

export function getMicGainPreference(): number {
    if (typeof window === 'undefined') return DEFAULT_MIC_GAIN;
    const stored = Number(window.localStorage.getItem(MIC_GAIN_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_MIC_GAIN;
}

export function setMicGainPreference(value: number) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MIC_GAIN_KEY, String(value));
    window.dispatchEvent(new Event(MIC_GAIN_CHANGE_EVENT));
}

const DM_NOTIFICATION_SOUND_KEY = 'gocall:dmNotificationSound';

export function getDmNotificationSoundPreference(): boolean {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(DM_NOTIFICATION_SOUND_KEY);
    return stored === null ? true : stored === 'true';
}

export function setDmNotificationSoundPreference(value: boolean) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DM_NOTIFICATION_SOUND_KEY, String(value));
}

const DM_TOAST_KEY = 'gocall:dmToast';

export function getDmToastPreference(): boolean {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(DM_TOAST_KEY);
    return stored === null ? true : stored === 'true';
}

export function setDmToastPreference(value: boolean) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DM_TOAST_KEY, String(value));
}

const ACCENT_COLOR_KEY = 'gocall:accentColor';
export const DEFAULT_ACCENT_COLOR = '#ff6b4a';
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function normalizeHexColor(value: string): string | null {
    const trimmed = value.trim();
    if (!HEX_COLOR_REGEX.test(trimmed)) return null;
    if (trimmed.length === 4) {
        const [, r, g, b] = trimmed;
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return trimmed.toLowerCase();
}

export function getAccentColorPreference(): string {
    if (typeof window === 'undefined') return DEFAULT_ACCENT_COLOR;
    return window.localStorage.getItem(ACCENT_COLOR_KEY) ?? DEFAULT_ACCENT_COLOR;
}

export function applyAccentColorPreference(hex?: string) {
    if (typeof window === 'undefined') return;
    document.documentElement.style.setProperty('--brand', hex ?? getAccentColorPreference());
}

export function setAccentColorPreference(hex: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCENT_COLOR_KEY, hex);
    applyAccentColorPreference(hex);
}

export async function getAudioCaptureOptions(): Promise<AudioCaptureOptions> {
    const deviceId = getAudioInputDevicePreference();
    const noiseSuppression = getAdvancedNoiseSuppressionPreference() ? false : getNoiseSuppressionPreference();

    return {
        noiseSuppression,
        echoCancellation: true,
        autoGainControl: true,
        voiceIsolation: noiseSuppression,
        ...(deviceId ? { deviceId } : {}),
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
    await localParticipant.setMicrophoneEnabled(true, options);
    const advancedSuppressionActive = await applyMicProcessingToMicrophone(localParticipant);
    return { advancedSuppressionActive };
}

let activeMicGainProcessor: MicGainProcessor | undefined;
let activeMicGainProcessorTrack: LocalAudioTrack | undefined;

export async function applyMicProcessingToMicrophone(localParticipant: LocalParticipant): Promise<boolean> {
    const track = localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
    if (!(track instanceof LocalAudioTrack)) return false;

    const gain = getMicGainPreference() / 100;
    const wantsDenoise = getAdvancedNoiseSuppressionPreference();

    if (gain === 1 && !wantsDenoise) {
        activeMicGainProcessor = undefined;
        activeMicGainProcessorTrack = undefined;
        await track.stopProcessor().catch(console.error);
        return false;
    }

    if (
        activeMicGainProcessorTrack === track &&
        activeMicGainProcessor &&
        activeMicGainProcessor.hasDenoise === wantsDenoise
    ) {
        activeMicGainProcessor.setGain(gain);
        return wantsDenoise;
    }

    const denoiseProcessor = wantsDenoise ? await createAdvancedNoiseSuppressionProcessor() : undefined;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            track.setAudioContext(new AudioContextClass());
        }
        const chain = new MicGainProcessor(gain, denoiseProcessor);
        await track.setProcessor(chain);
        activeMicGainProcessor = chain;
        activeMicGainProcessorTrack = track;
        return Boolean(denoiseProcessor);
    } catch (err) {
        console.error('Não foi possível aplicar o processamento de microfone:', err);
        activeMicGainProcessor = undefined;
        activeMicGainProcessorTrack = undefined;
        return false;
    }
}

type SoundType = 'join' | 'leave' | 'mute' | 'unmute' | 'deafen' | 'undeafen' | 'screenshare-start' | 'screenshare-stop' | 'message' | 'call-ring' | 'call-ringback';

function playTone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    { type = 'sine', peakGain = 0.12, filterFreq }: { type?: OscillatorType; peakGain?: number; filterFreq?: number } = {}
) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    let lastNode: AudioNode = osc;

    if (filterFreq) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;
        lastNode.connect(filter);
        lastNode = filter;
    }
    lastNode.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
}

function playNoiseBurst(ctx: AudioContext, startTime: number, duration: number, peakGain = 0.15) {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;
    const gain = ctx.createGain();

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    noise.start(startTime);
    noise.stop(startTime + duration + 0.01);
}

export function playSound(type: SoundType) {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        switch (type) {
            case 'join':
                playNoiseBurst(ctx, now, 0.02, 0.12);
                playTone(ctx, 349.23, now, 0.05, { type: 'triangle', peakGain: 0.3 });
                playTone(ctx, 523.25, now + 0.05, 0.18, { type: 'triangle', peakGain: 0.32 });
                break;
            case 'leave':
                playTone(ctx, 523.25, now, 0.05, { type: 'triangle', peakGain: 0.28 });
                playTone(ctx, 293.66, now + 0.05, 0.22, { type: 'triangle', peakGain: 0.3 });
                break;
            case 'mute':
                playNoiseBurst(ctx, now, 0.015, 0.1);
                playTone(ctx, 220, now, 0.08, { type: 'square', peakGain: 0.22, filterFreq: 700 });
                break;
            case 'unmute':
                playTone(ctx, 220, now, 0.05, { type: 'square', peakGain: 0.2, filterFreq: 1400 });
                playTone(ctx, 440, now + 0.05, 0.09, { type: 'square', peakGain: 0.24 });
                break;
            case 'deafen':
                playTone(ctx, 260, now, 0.1, { type: 'sawtooth', peakGain: 0.2, filterFreq: 500 });
                playTone(ctx, 155, now + 0.08, 0.2, { type: 'sawtooth', peakGain: 0.22, filterFreq: 380 });
                break;
            case 'undeafen':
                playTone(ctx, 300, now, 0.06, { type: 'sawtooth', peakGain: 0.2 });
                playTone(ctx, 500, now + 0.06, 0.13, { type: 'sawtooth', peakGain: 0.24 });
                break;
            case 'screenshare-start':
                playTone(ctx, 392, now, 0.06, { type: 'triangle', peakGain: 0.24 });
                playTone(ctx, 523.25, now + 0.06, 0.06, { type: 'triangle', peakGain: 0.26 });
                playTone(ctx, 659.25, now + 0.12, 0.2, { type: 'triangle', peakGain: 0.3 });
                break;
            case 'screenshare-stop':
                playTone(ctx, 659.25, now, 0.06, { type: 'triangle', peakGain: 0.24 });
                playTone(ctx, 440, now + 0.06, 0.22, { type: 'triangle', peakGain: 0.26 });
                break;
            case 'message':
                playTone(ctx, 587.33, now, 0.07, { type: 'sine', peakGain: 0.22 });
                playTone(ctx, 880, now + 0.07, 0.13, { type: 'sine', peakGain: 0.22 });
                break;
            case 'call-ring':
                playTone(ctx, 480, now, 0.4, { type: 'sine', peakGain: 0.26 });
                playTone(ctx, 620, now, 0.4, { type: 'sine', peakGain: 0.2 });
                playTone(ctx, 480, now + 0.5, 0.4, { type: 'sine', peakGain: 0.26 });
                playTone(ctx, 620, now + 0.5, 0.4, { type: 'sine', peakGain: 0.2 });
                break;
            case 'call-ringback':
                playTone(ctx, 440, now, 1.0, { type: 'sine', peakGain: 0.16 });
                playTone(ctx, 480, now, 1.0, { type: 'sine', peakGain: 0.12 });
                break;
        }

        setTimeout(() => ctx.close().catch(() => {}), 1300);
    } catch {
        console.error("Áudio bloqueado pelo navegador");
    }
}
