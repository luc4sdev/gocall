'use client';

import '@livekit/components-styles';
import { Loader2 } from 'lucide-react';
import { ConnectionState } from 'livekit-client';
import { useConnectionState } from '@livekit/components-react';
import { CustomControlBar } from './CustomControlBar';
import { CustomVideoGrid } from './CustomVideoGrid';

interface VoiceRoomProps {
    onLeave: () => void;
    theaterMode: boolean;
    onTheaterModeChange: (next: boolean) => void;
    channelName: string;
    skipAutoPause?: boolean;
}

export function VoiceRoom({ onLeave, theaterMode, onTheaterModeChange, channelName, skipAutoPause }: VoiceRoomProps) {
    const connectionState = useConnectionState();

    if (connectionState !== ConnectionState.Connected) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0C0D] gap-4">
                <Loader2 size={28} className="text-brand animate-spin" />
                <p className="text-sm text-[#8B8D93]">Entrando em {channelName}...</p>
                <button
                    onClick={onLeave}
                    className="text-[13px] text-[#63656B] hover:text-[#EDEBE7] transition-colors"
                >
                    Cancelar
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0B0C0D] relative">
            <div className="flex-1 min-h-0 flex">
                <div className="flex-1 min-w-0 relative">
                    <CustomVideoGrid theaterMode={theaterMode} onTheaterModeChange={onTheaterModeChange} skipAutoPause={skipAutoPause} />
                </div>
            </div>

            <CustomControlBar onLeave={onLeave} />
        </div>
    );
}
