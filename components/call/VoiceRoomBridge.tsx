'use client';

import { useEffect } from 'react';
import { ConnectionState } from 'livekit-client';
import { useConnectionState, useIsSpeaking, useLocalParticipant } from '@livekit/components-react';
import { getAudioCaptureOptions, playDiscordSound } from '@/lib/utils';
import { useParticipantAudio } from './ParticipantAudioContext';

export interface VoiceControlState {
    isMicrophoneEnabled: boolean;
    isScreenShareEnabled: boolean;
    isSpeaking: boolean;
    isDeafened: boolean;
    toggleMic: () => void;
    toggleDeafen: () => void;
}


export function VoiceRoomBridge({ onStateChange }: { onStateChange: (state: VoiceControlState) => void }) {
    const { localParticipant, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant();

    const isSpeaking = useIsSpeaking(localParticipant);
    const { isDeafened, toggleDeafen: toggleDeafenState } = useParticipantAudio();
    const connectionState = useConnectionState();

    useEffect(() => {

        if (connectionState !== ConnectionState.Connected) return;
        if (localParticipant.isMicrophoneEnabled) return;

        let cancelled = false;
        (async () => {
            const options = getAudioCaptureOptions();
            if (cancelled) return;
            try {
                await localParticipant.setMicrophoneEnabled(true, options);
                if (!cancelled) playDiscordSound('join');
            } catch (err) {
                console.error('Não foi possível ativar o microfone', err);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionState]);

    useEffect(() => {
        const toggleMic = () => {
            const next = !isMicrophoneEnabled;
            playDiscordSound(next ? 'unmute' : 'mute');
            (async () => {
                const options = next ? await getAudioCaptureOptions() : undefined;
                localParticipant.setMicrophoneEnabled(next, options).catch(console.error);
            })();
        };

        const toggleDeafen = () => {
            const next = !isDeafened;
            toggleDeafenState();
            playDiscordSound(next ? 'deafen' : 'undeafen');
            if (next && isMicrophoneEnabled) {
                localParticipant.setMicrophoneEnabled(false).catch(console.error);
            }
        };

        onStateChange({ isMicrophoneEnabled, isScreenShareEnabled, isSpeaking, isDeafened, toggleMic, toggleDeafen });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMicrophoneEnabled, isScreenShareEnabled, isSpeaking, isDeafened, localParticipant]);

    return null;
}
