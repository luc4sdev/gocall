'use client';

import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import type { ChannelDTO } from '@/lib/types';

export type ChannelSyncMessage =
    | { type: 'created'; channel: ChannelDTO }
    | { type: 'deleted'; channelId: string };

export type BroadcastChannelSync = (message: ChannelSyncMessage) => void;

const TOPIC = 'gocall-channel-sync';

interface ChannelSyncBridgeProps {
    onMessage: (message: ChannelSyncMessage) => void;
    onReady: (broadcast: BroadcastChannelSync) => void;
}

export function ChannelSyncBridge({ onMessage, onReady }: ChannelSyncBridgeProps) {
    const room = useRoomContext();

    useEffect(() => {
        const broadcast: BroadcastChannelSync = (message) => {
            const payload = new TextEncoder().encode(JSON.stringify(message));
            room.localParticipant.publishData(payload, { reliable: true, topic: TOPIC }).catch(console.error);
        };
        onReady(broadcast);
    }, [room, onReady]);

    useEffect(() => {
        const handleData = (payload: Uint8Array, _participant?: unknown, _kind?: unknown, topic?: string) => {
            if (topic !== TOPIC) return;
            try {
                const message: ChannelSyncMessage = JSON.parse(new TextDecoder().decode(payload));
                onMessage(message);
            } catch (err) {
                console.error('Erro ao processar sincronização de canal:', err);
            }
        };
        room.on(RoomEvent.DataReceived, handleData);
        return () => {
            room.off(RoomEvent.DataReceived, handleData);
        };
    }, [room, onMessage]);

    return null;
}
