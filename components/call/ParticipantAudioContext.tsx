'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { RemoteAudioTrack, RoomEvent, Track, type RemoteParticipant, type RemoteTrackPublication } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

const DEFAULT_VOLUME = 0.5;

export function getScreenShareVolumeKey(identity: string) {
    return `${identity}::screen`;
}

function keyForPublication(identity: string, pub: RemoteTrackPublication) {
    return pub.source === Track.Source.ScreenShareAudio ? getScreenShareVolumeKey(identity) : identity;
}

interface ParticipantAudioContextValue {
    getVolume: (key: string) => number;
    setVolume: (key: string, volume: number) => void;
    isMuted: (key: string) => boolean;
    toggleMute: (key: string) => void;
    isDeafened: boolean;
    toggleDeafen: () => void;
}

const ParticipantAudioContext = createContext<ParticipantAudioContextValue | null>(null);

export function ParticipantAudioProvider({ children }: { children: React.ReactNode }) {
    const room = useRoomContext();
    const [volumes, setVolumes] = useState<Record<string, number>>({});
    const [muted, setMuted] = useState<Record<string, boolean>>({});
    const [isDeafened, setIsDeafened] = useState(false);

    const effectiveVolume = useCallback((key: string) => {
        if (isDeafened || muted[key]) return 0;
        return volumes[key] ?? DEFAULT_VOLUME;
    }, [volumes, muted, isDeafened]);

    const applyToParticipant = useCallback((identity: string) => {
        const participant = room.remoteParticipants.get(identity);
        if (!participant) return;
        participant.audioTrackPublications.forEach((pub) => {
            if (pub.audioTrack instanceof RemoteAudioTrack) {
                pub.audioTrack.setVolume(effectiveVolume(keyForPublication(identity, pub)));
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

    const getVolume = useCallback((key: string) => volumes[key] ?? DEFAULT_VOLUME, [volumes]);

    const setVolume = useCallback((key: string, volume: number) => {
        const clamped = Math.min(1, Math.max(0, volume));
        setVolumes((prev) => ({ ...prev, [key]: clamped }));
    }, []);

    const isMuted = useCallback((key: string) => !!muted[key], [muted]);

    const toggleMute = useCallback((key: string) => {
        setMuted((prev) => ({ ...prev, [key]: !prev[key] }));
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
