'use client';

import { useEffect } from 'react';
import { ConnectionState } from 'livekit-client';
import { useConnectionState, useLocalParticipant } from '@livekit/components-react';


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

    useEffect(() => {
        if (connectionState !== ConnectionState.Connected) return;

        localParticipant
            .setAttributes({
                inCall: voiceChannelId ? 'true' : 'false',
                voiceChannelId: voiceChannelId ?? '',
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
