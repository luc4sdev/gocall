'use client';

import { useEffect, useRef } from 'react';
import { ConnectionState } from 'livekit-client';
import { useConnectionState, useLocalParticipant, useParticipants } from '@livekit/components-react';


export function LobbyPresence({
    voiceChannelId,
    isSpeaking = false,
    isScreenSharing = false,
}: {
    voiceChannelId: string | null;
    isSpeaking?: boolean;
    isScreenSharing?: boolean;
}) {
    const { localParticipant } = useLocalParticipant();
    const connectionState = useConnectionState();
    const participants = useParticipants();

    const participantsRef = useRef(participants);
    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    useEffect(() => {
        if (connectionState !== ConnectionState.Connected) return;

        if (!voiceChannelId) {
            localParticipant
                .setAttributes({ inCall: 'false', voiceChannelId: '', voiceChannelStartedAt: '' })
                .catch(console.error);
            return;
        }

        const existing = participantsRef.current.find((p) =>
            p.identity !== localParticipant.identity &&
            p.attributes?.inCall === 'true' &&
            p.attributes?.voiceChannelId === voiceChannelId &&
            p.attributes?.voiceChannelStartedAt
        );
        const startedAt = existing?.attributes?.voiceChannelStartedAt ?? String(Date.now());

        localParticipant
            .setAttributes({
                inCall: 'true',
                voiceChannelId,
                voiceChannelStartedAt: startedAt,
            })
            .catch(console.error);
    }, [localParticipant, voiceChannelId, connectionState]);

    useEffect(() => {
        if (connectionState !== ConnectionState.Connected) return;
        const timeout = setTimeout(() => {
            localParticipant
                .setAttributes({ speaking: isSpeaking ? 'true' : 'false' })
                .catch(console.error);
        }, 250);
        return () => clearTimeout(timeout);
    }, [localParticipant, isSpeaking, connectionState]);

    useEffect(() => {
        if (connectionState !== ConnectionState.Connected) return;
        localParticipant
            .setAttributes({ screenSharing: isScreenSharing ? 'true' : 'false' })
            .catch(console.error);
    }, [localParticipant, isScreenSharing, connectionState]);

    return null;
}
