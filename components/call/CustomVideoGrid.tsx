import { useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useMemo, useState } from 'react';
import { Maximize } from 'lucide-react';
import { GridLayout } from '@livekit/components-react';
import { CustomParticipantTile } from './CustomParticipantTile';

export function CustomVideoGrid() {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false }
    );

    const screenShareTracks = tracks.filter(t => t.source === Track.Source.ScreenShare);

    const [focusedKey, setFocusedKey] = useState<string | null>(null);

    const focusedTrack = useMemo(() => {
        if (screenShareTracks.length === 0) return undefined;
        const match = screenShareTracks.find(t => `${t.participant.identity}-${t.source}` === focusedKey);
        return match ?? screenShareTracks[0];
    }, [screenShareTracks, focusedKey]);

    const toggleFullscreen = (e: React.MouseEvent, elementId: string) => {
        e.stopPropagation();
        const el = document.getElementById(elementId);
        if (el) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                el.requestFullscreen();
            }
        }
    };

    if (focusedTrack) {
        const focusId = `screen-${focusedTrack.participant.identity}`;
        return (
            <div className="flex flex-col lg:flex-row h-full p-2 gap-2">
                <div id={focusId} className="flex-1 bg-black rounded-lg overflow-hidden relative group">
                    <CustomParticipantTile trackRef={focusedTrack} className="object-contain" />
                    <button
                        onClick={(e) => toggleFullscreen(e, focusId)}
                        className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 rounded text-white opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg"
                        title="Tela cheia"
                    >
                        <Maximize size={20} />
                    </button>
                </div>

                <div className="w-full lg:w-64 h-32 lg:h-full flex flex-row lg:flex-col gap-2 overflow-auto">
                    {tracks
                        .filter(t => t !== focusedTrack)
                        .map(t => {
                            const isScreenShare = t.source === Track.Source.ScreenShare;
                            const key = `${t.participant.identity}-${t.source}`;
                            return (
                                <div
                                    key={key}
                                    onClick={() => isScreenShare && setFocusedKey(key)}
                                    className={`w-48 lg:w-full h-full lg:h-48 shrink-0 bg-[#1E1F23] rounded-lg overflow-hidden border transition-colors ${isScreenShare ? 'border-[#FF6B4A]/40 hover:border-[#FF6B4A] cursor-pointer' : 'border-white/6'
                                        }`}
                                    title={isScreenShare ? 'Clique para destacar esta transmissão' : undefined}
                                >
                                    <CustomParticipantTile trackRef={t} />
                                </div>
                            );
                        })}
                </div>
            </div>
        );
    }

    return (
        <GridLayout tracks={tracks} className="p-4 gap-4 h-full">
            <CustomParticipantTile />
        </GridLayout>
    );
}