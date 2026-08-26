'use client';

import { useEffect } from 'react';
import { ConnectionState, LocalVideoTrack, Track } from 'livekit-client';
import { useConnectionState, useIsSpeaking, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import {
    ADVANCED_NOISE_SUPPRESSION_CHANGE_EVENT,
    AUDIO_DEVICE_CHANGE_EVENT,
    MIC_GAIN_CHANGE_EVENT,
    type AudioDeviceChangeDetail,
    applyMicProcessingToMicrophone,
    enableMicrophone,
    getAdvancedNoiseSuppressionPreference,
    getAudioInputDevicePreference,
    getAudioOutputDevicePreference,
    playSound,
} from '@/lib/utils';
import { captureVideoTrackThumbnail } from '@/components/layout/ScreenShareThumbnailBridge';
import { useParticipantAudio } from './ParticipantAudioContext';

const THUMBNAIL_INTERVAL_MS = 5 * 60 * 1000;

export interface VoiceControlState {
    isMicrophoneEnabled: boolean;
    isScreenShareEnabled: boolean;
    isSpeaking: boolean;
    isDeafened: boolean;
    toggleMic: () => void;
    toggleDeafen: () => void;
}


export function VoiceRoomBridge({
    onStateChange,
    onThumbnail,
}: {
    onStateChange: (state: VoiceControlState) => void;
    onThumbnail?: (dataUrl: string) => void;
}) {
    const { localParticipant, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant();

    const isSpeaking = useIsSpeaking(localParticipant);
    const { isDeafened, toggleDeafen: toggleDeafenState } = useParticipantAudio();
    const connectionState = useConnectionState();
    const room = useRoomContext();

    useEffect(() => {

        if (connectionState !== ConnectionState.Connected) return;
        if (localParticipant.isMicrophoneEnabled) return;

        let cancelled = false;
        let removeRetryListener: (() => void) | undefined;
        (async () => {
            try {
                const { advancedSuppressionActive } = await enableMicrophone(localParticipant);
                if (cancelled) return;
                playSound('join');

                if (!advancedSuppressionActive && getAdvancedNoiseSuppressionPreference()) {
                    const retry = () => {
                        applyMicProcessingToMicrophone(localParticipant);
                    };
                    window.addEventListener('pointerdown', retry, { once: true });
                    removeRetryListener = () => window.removeEventListener('pointerdown', retry);
                }
            } catch (err) {
                console.error('Não foi possível ativar o microfone', err);
            }
        })();
        return () => {
            cancelled = true;
            removeRetryListener?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionState]);

    useEffect(() => {
        if (connectionState !== ConnectionState.Connected) return;

        const applyDevice = (kind: 'audioinput' | 'audiooutput', deviceId: string) => {
            if (!deviceId) return;
            room.switchActiveDevice(kind, deviceId).catch(console.error);
        };

        applyDevice('audioinput', getAudioInputDevicePreference());
        applyDevice('audiooutput', getAudioOutputDevicePreference());

        const handleDeviceChange = (e: Event) => {
            const detail = (e as CustomEvent<AudioDeviceChangeDetail>).detail;
            if (detail) applyDevice(detail.kind, detail.deviceId);
        };
        window.addEventListener(AUDIO_DEVICE_CHANGE_EVENT, handleDeviceChange);
        return () => window.removeEventListener(AUDIO_DEVICE_CHANGE_EVENT, handleDeviceChange);
    }, [connectionState, room]);

    useEffect(() => {
        if (connectionState !== ConnectionState.Connected) return;

        const reapply = () => {
            applyMicProcessingToMicrophone(localParticipant);
        };

        window.addEventListener(ADVANCED_NOISE_SUPPRESSION_CHANGE_EVENT, reapply);
        window.addEventListener(MIC_GAIN_CHANGE_EVENT, reapply);
        return () => {
            window.removeEventListener(ADVANCED_NOISE_SUPPRESSION_CHANGE_EVENT, reapply);
            window.removeEventListener(MIC_GAIN_CHANGE_EVENT, reapply);
        };
    }, [connectionState, localParticipant]);

    useEffect(() => {
        const toggleMic = () => {
            const next = !isMicrophoneEnabled;
            playSound(next ? 'unmute' : 'mute');
            if (next) {
                enableMicrophone(localParticipant).catch(console.error);
            } else {
                localParticipant.setMicrophoneEnabled(false).catch(console.error);
            }
        };

        const toggleDeafen = () => {
            const next = !isDeafened;
            toggleDeafenState();
            playSound(next ? 'deafen' : 'undeafen');
            if (next && isMicrophoneEnabled) {
                localParticipant.setMicrophoneEnabled(false).catch(console.error);
            }
        };

        onStateChange({ isMicrophoneEnabled, isScreenShareEnabled, isSpeaking, isDeafened, toggleMic, toggleDeafen });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMicrophoneEnabled, isScreenShareEnabled, isSpeaking, isDeafened, localParticipant]);

    useEffect(() => {
        if (!isScreenShareEnabled || !onThumbnail) return;

        let cancelled = false;
        let retryTimeout: ReturnType<typeof setTimeout> | undefined;

        const capture = async () => {
            const track = localParticipant.getTrackPublication(Track.Source.ScreenShare)?.track;
            if (!(track instanceof LocalVideoTrack) || !track.mediaStreamTrack) return false;
            const dataUrl = await captureVideoTrackThumbnail(track.mediaStreamTrack);
            if (!dataUrl || cancelled) return false;
            onThumbnail(dataUrl);
            return true;
        };

        const attempt = async (retriesLeft: number) => {
            const success = await capture();
            if (!success && retriesLeft > 0 && !cancelled) {
                retryTimeout = setTimeout(() => attempt(retriesLeft - 1), 1500);
            }
        };

        attempt(6);
        const interval = setInterval(capture, THUMBNAIL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearTimeout(retryTimeout);
            clearInterval(interval);
        };
    }, [isScreenShareEnabled, localParticipant, onThumbnail]);

    return null;
}
