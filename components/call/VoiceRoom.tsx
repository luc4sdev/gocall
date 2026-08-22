'use client';

import '@livekit/components-styles';
import { CustomControlBar } from './CustomControlBar';
import { CustomVideoGrid } from './CustomVideoGrid';

interface VoiceRoomProps {
    onLeave: () => void;
    theaterMode: boolean;
    onTheaterModeChange: (next: boolean) => void;
}

export function VoiceRoom({ onLeave, theaterMode, onTheaterModeChange }: VoiceRoomProps) {
    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0B0C0D]">
            <div className="flex-1 min-h-0 relative">
                <CustomVideoGrid theaterMode={theaterMode} onTheaterModeChange={onTheaterModeChange} />
            </div>
            <CustomControlBar onLeave={onLeave} />
        </div>
    );
}
