'use client';

import { useEffect, useRef } from 'react';
import { DisconnectReason, RoomEvent } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

export function RoomReconnectBridge({ onDisconnected }: { onDisconnected: () => void }) {
    const room = useRoomContext();
    const attemptsRef = useRef(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const clearPending = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };

        const handleDisconnected = (reason?: DisconnectReason) => {
            if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
                attemptsRef.current = 0;
                clearPending();
                return;
            }
            const delaySeconds = Math.min(2 ** attemptsRef.current, 30);
            attemptsRef.current += 1;
            clearPending();
            timeoutRef.current = setTimeout(onDisconnected, delaySeconds * 1000);
        };

        const handleRecovered = () => {
            attemptsRef.current = 0;
            clearPending();
        };

        room.on(RoomEvent.Disconnected, handleDisconnected);
        room.on(RoomEvent.Reconnected, handleRecovered);
        room.on(RoomEvent.Connected, handleRecovered);
        return () => {
            clearPending();
            room.off(RoomEvent.Disconnected, handleDisconnected);
            room.off(RoomEvent.Reconnected, handleRecovered);
            room.off(RoomEvent.Connected, handleRecovered);
        };
    }, [room, onDisconnected]);

    return null;
}
