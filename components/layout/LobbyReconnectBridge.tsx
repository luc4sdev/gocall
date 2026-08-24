'use client';

import { useEffect, useRef } from 'react';
import { RoomEvent } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

export function LobbyReconnectBridge({ onDisconnected }: { onDisconnected: () => void }) {
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

        const handleDisconnected = () => {
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
