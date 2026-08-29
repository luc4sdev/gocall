'use client';

import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';

export type CallSignalType = 'invite' | 'accept' | 'decline' | 'cancel' | 'timeout' | 'busy' | 'end';

export interface CallSignalPayload {
    signal: CallSignalType;
    callId: string;
    fromId: string;
    fromName: string;
    toId: string;
    roomName?: string;
}

export type SendCallSignal = (payload: CallSignalPayload) => void;

const TOPIC = 'gocall-call-signal';

interface CallSignalBridgeProps {
    onSignal: (payload: CallSignalPayload) => void;
    onReady: (send: SendCallSignal) => void;
}

export function CallSignalBridge({ onSignal, onReady }: CallSignalBridgeProps) {
    const room = useRoomContext();

    useEffect(() => {
        const send: SendCallSignal = (payload) => {
            const data = new TextEncoder().encode(JSON.stringify(payload));
            room.localParticipant
                .publishData(data, { reliable: true, topic: TOPIC, destinationIdentities: [payload.toId] })
                .catch((err) => console.error('Falha ao enviar sinal de chamada:', err));
        };
        onReady(send);
    }, [room, onReady]);

    useEffect(() => {
        const handleData = (payload: Uint8Array, _participant?: unknown, _kind?: unknown, topic?: string) => {
            if (topic !== TOPIC) return;
            try {
                const message: CallSignalPayload = JSON.parse(new TextDecoder().decode(payload));
                onSignal(message);
            } catch (err) {
                console.error('Sinal de chamada inválido:', err);
            }
        };
        room.on(RoomEvent.DataReceived, handleData);
        return () => {
            room.off(RoomEvent.DataReceived, handleData);
        };
    }, [room, onSignal]);

    return null;
}
