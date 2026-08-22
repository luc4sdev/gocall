'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { RemoteAudioTrack, RoomEvent, type RemoteParticipant, type Track } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

const DEFAULT_VOLUME = 0.5;

interface ParticipantAudioContextValue {
    getVolume: (identity: string) => number;
    setVolume: (identity: string, volume: number) => void;
    isMuted: (identity: string) => boolean;
    toggleMute: (identity: string) => void;
    isDeafened: boolean;
    toggleDeafen: () => void;
}

const ParticipantAudioContext = createContext<ParticipantAudioContextValue | null>(null);

export function ParticipantAudioProvider({ children }: { children: React.ReactNode }) {
    const room = useRoomContext();
    const [volumes, setVolumes] = useState<Record<string, number>>({});
    const [muted, setMuted] = useState<Record<string, boolean>>({});
    const [isDeafened, setIsDeafened] = useState(false);

    const effectiveVolume = useCallback((identity: string) => {
        if (isDeafened || muted[identity]) return 0;
        return volumes[identity] ?? DEFAULT_VOLUME;
    }, [volumes, muted, isDeafened]);

    const applyToParticipant = useCallback((identity: string) => {
        const participant = room.remoteParticipants.get(identity);
        if (!participant) return;
        const vol = effectiveVolume(identity);
        participant.audioTrackPublications.forEach((pub) => {
            if (pub.audioTrack instanceof RemoteAudioTrack) {
                pub.audioTrack.setVolume(vol);
            }
        });
    }, [room, effectiveVolume]);

    const applyToAll = useCallback(() => {
        room.remoteParticipants.forEach((participant) => applyToParticipant(participant.identity));
    }, [room, applyToParticipant]);

    useEffect(() => {
        applyToAll();
    }, [volumes, muted, isDeafened, applyToAll]);

    useEffect(() => {
        const handleSubscribed = (track: Track, _pub: unknown, participant: RemoteParticipant) => {
            if (track instanceof RemoteAudioTrack) {
                applyToParticipant(participant.identity);
            }
        };
        room.on(RoomEvent.TrackSubscribed, handleSubscribed);
        return () => {
            room.off(RoomEvent.TrackSubscribed, handleSubscribed);
        };
    }, [room, applyToParticipant]);

    const getVolume = useCallback((identity: string) => volumes[identity] ?? DEFAULT_VOLUME, [volumes]);

    const setVolume = useCallback((identity: string, volume: number) => {
        const clamped = Math.min(1, Math.max(0, volume));
        setVolumes((prev) => ({ ...prev, [identity]: clamped }));
    }, []);

    const isMuted = useCallback((identity: string) => !!muted[identity], [muted]);

    const toggleMute = useCallback((identity: string) => {
        setMuted((prev) => ({ ...prev, [identity]: !prev[identity] }));
    }, []);

    const toggleDeafen = useCallback(() => {
        setIsDeafened((prev) => !prev);
    }, []);

    const value = useMemo<ParticipantAudioContextValue>(() => ({
        getVolume,
        setVolume,
        isMuted,
        toggleMute,
        isDeafened,
        toggleDeafen,
    }), [getVolume, setVolume, isMuted, toggleMute, isDeafened, toggleDeafen]);

    return (
        <ParticipantAudioContext.Provider value={value}>
            {children}
        </ParticipantAudioContext.Provider>
    );
}

export function useParticipantAudio() {
    const ctx = useContext(ParticipantAudioContext);
    if (!ctx) throw new Error('useParticipantAudio must be used within a ParticipantAudioProvider');
    return ctx;
}
