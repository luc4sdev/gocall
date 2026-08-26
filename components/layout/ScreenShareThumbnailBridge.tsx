'use client';

import { useEffect, useRef } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Participant, RemoteParticipant, RoomEvent } from 'livekit-client';

export interface ScreenShareThumbnail {
    identity: string;
    dataUrl: string;
    updatedAt: number;
}

const TOPIC = 'gocall-screenshare-thumbnail';
const REQUEST_TOPIC = 'gocall-screenshare-thumbnail-request';
const REQUEST_RETRY_MS = 3000;
const REQUEST_MAX_RETRIES = 5;

interface ImageCaptureLike {
    grabFrame(): Promise<ImageBitmap>;
}

export async function captureVideoTrackThumbnail(
    track: MediaStreamTrack,
    maxWidth = 320,
    quality = 0.5
): Promise<string | null> {
    try {
        const ImageCaptureCtor = (window as unknown as {
            ImageCapture?: new (track: MediaStreamTrack) => ImageCaptureLike;
        }).ImageCapture;
        if (!ImageCaptureCtor) return null;

        const bitmap = await new ImageCaptureCtor(track).grabFrame();
        const scale = Math.min(1, maxWidth / bitmap.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', quality);
    } catch (err) {
        console.error('Não foi possível capturar prévia da transmissão:', err);
        return null;
    }
}

interface ScreenShareThumbnailBridgeProps {
    thumbnail: string | null;
    onReceive: (thumbnail: ScreenShareThumbnail) => void;
    requestFrom?: string[];
}

export function ScreenShareThumbnailBridge({ thumbnail, onReceive, requestFrom }: ScreenShareThumbnailBridgeProps) {
    const room = useRoomContext();
    const thumbnailRef = useRef<string | null>(thumbnail);

    useEffect(() => {
        thumbnailRef.current = thumbnail;
        if (!thumbnail) return;
        const payload = new TextEncoder().encode(JSON.stringify({ dataUrl: thumbnail }));
        room.localParticipant.publishData(payload, { reliable: true, topic: TOPIC }).catch(console.error);
    }, [room, thumbnail]);

    useEffect(() => {
        const handleParticipantConnected = (participant: RemoteParticipant) => {
            if (!thumbnailRef.current) return;
            const payload = new TextEncoder().encode(JSON.stringify({ dataUrl: thumbnailRef.current }));
            room.localParticipant
                .publishData(payload, { reliable: true, topic: TOPIC, destinationIdentities: [participant.identity] })
                .catch(console.error);
        };
        room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
        return () => {
            room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
        };
    }, [room]);

    useEffect(() => {
        const respondToRequest = (participant: Participant) => {
            if (!thumbnailRef.current) return;
            const payload = new TextEncoder().encode(JSON.stringify({ dataUrl: thumbnailRef.current }));
            room.localParticipant
                .publishData(payload, { reliable: true, topic: TOPIC, destinationIdentities: [participant.identity] })
                .catch(console.error);
        };

        const handleData = (payload: Uint8Array, participant?: Participant, _kind?: unknown, topic?: string) => {
            if (!participant) return;
            if (topic === REQUEST_TOPIC) {
                respondToRequest(participant);
                return;
            }
            if (topic !== TOPIC) return;
            try {
                const { dataUrl } = JSON.parse(new TextDecoder().decode(payload));
                if (typeof dataUrl === 'string') {
                    onReceive({ identity: participant.identity, dataUrl, updatedAt: Date.now() });
                }
            } catch (err) {
                console.error('Erro ao processar prévia de transmissão:', err);
            }
        };
        room.on(RoomEvent.DataReceived, handleData);
        return () => {
            room.off(RoomEvent.DataReceived, handleData);
        };
    }, [room, onReceive]);

    const requestKey = requestFrom && requestFrom.length > 0 ? [...requestFrom].sort().join(',') : '';

    useEffect(() => {
        if (!requestKey) return;
        const identities = requestKey.split(',');
        let cancelled = false;
        let retries = 0;

        const sendRequest = () => {
            const payload = new TextEncoder().encode('{}');
            room.localParticipant
                .publishData(payload, { reliable: true, topic: REQUEST_TOPIC, destinationIdentities: identities })
                .catch(console.error);
        };

        sendRequest();
        const interval = setInterval(() => {
            if (cancelled) return;
            retries += 1;
            if (retries > REQUEST_MAX_RETRIES) {
                clearInterval(interval);
                return;
            }
            sendRequest();
        }, REQUEST_RETRY_MS);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [room, requestKey]);

    return null;
}
