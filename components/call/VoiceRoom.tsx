'use client';

import '@livekit/components-styles';
import { useEffect, useRef } from 'react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { CustomControlBar } from './CustomControlBar';
import { CustomVideoGrid } from './CustomVideoGrid';
import { playDiscordSound } from '@/lib/utils';

interface VoiceRoomProps {
    onLeave: () => void;
    theaterMode: boolean;
    onTheaterModeChange: (next: boolean) => void;
}

export function VoiceRoom({ onLeave, theaterMode, onTheaterModeChange }: VoiceRoomProps) {
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
    const knownInCallRef = useRef<Set<string> | null>(null);

    useEffect(() => {
        playDiscordSound('join');
    }, []);

    useEffect(() => {
        const currentInCall = new Set(
            participants
                .filter((p) => p.identity !== localParticipant.identity && p.attributes?.inCall === 'true')
                .map((p) => p.identity)
        );

        const previousInCall = knownInCallRef.current;
        if (previousInCall) {
            for (const identity of currentInCall) {
                if (!previousInCall.has(identity)) playDiscordSound('join');
            }
            for (const identity of previousInCall) {
                if (!currentInCall.has(identity)) playDiscordSound('leave');
            }
        }
        knownInCallRef.current = currentInCall;
    }, [participants, localParticipant.identity]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0B0C0D]">
            <div className="flex-1 min-h-0 relative">
                <CustomVideoGrid theaterMode={theaterMode} onTheaterModeChange={onTheaterModeChange} />
            </div>
            <CustomControlBar onLeave={onLeave} />
        </div>
    );
}