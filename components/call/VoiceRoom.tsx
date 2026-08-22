'use client';

import '@livekit/components-styles';
import { useEffect } from 'react';
import { CustomControlBar } from './CustomControlBar';
import { CustomVideoGrid } from './CustomVideoGrid';
import { playDiscordSound } from '@/lib/utils';

interface VoiceRoomProps {
    onLeave: () => void;
}

export function VoiceRoom({ onLeave }: VoiceRoomProps) {

    useEffect(() => {
        playDiscordSound('join');
    }, []);

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0B0C0D]">
            <div className="flex-1 min-h-0 relative">
                <CustomVideoGrid />
            </div>
            <CustomControlBar onLeave={onLeave} />
        </div>
    );
}