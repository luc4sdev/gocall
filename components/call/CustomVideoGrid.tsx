import { isTrackReference, useTracks } from '@livekit/components-react';
import { RemoteTrackPublication, Track } from 'livekit-client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Maximize, PanelRightClose, PanelRightOpen, Volume2, VolumeX } from 'lucide-react';
import { GridLayout } from '@livekit/components-react';
import { CustomParticipantTile } from './CustomParticipantTile';
import { getScreenShareVolumeKey, useParticipantAudio } from './ParticipantAudioContext';
import { ParticipantVolumePanel } from './ParticipantVolumePanel';

interface CustomVideoGridProps {
    theaterMode: boolean;
    onTheaterModeChange: (next: boolean) => void;
}

export function CustomVideoGrid({ theaterMode, onTheaterModeChange }: CustomVideoGridProps) {
    const allTracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false }
    );

    const tracks = useMemo(
        () => allTracks.filter(t => t.participant.attributes?.inCall === 'true'),
        [allTracks]
    );

    const screenShareTracks = useMemo(
        () => tracks.filter(t => t.source === Track.Source.ScreenShare),
        [tracks]
    );

    const [focusedKey, setFocusedKey] = useState<string | null>(null);
    const [pausedKeys, setPausedKeys] = useState<Set<string>>(new Set());
    const [volumeOpen, setVolumeOpen] = useState(false);
    const volumeRef = useRef<HTMLDivElement>(null);
    const { isMuted } = useParticipantAudio();

    useEffect(() => {
        if (!volumeOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
                setVolumeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [volumeOpen]);

    const focusedTrack = useMemo(() => {
        if (screenShareTracks.length === 0) return undefined;
        const match = screenShareTracks.find(t => `${t.participant.identity}-${t.source}` === focusedKey);
        return match ?? screenShareTracks[0];
    }, [screenShareTracks, focusedKey]);

    const toggleWatching = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!focusedTrack || !isTrackReference(focusedTrack)) return;
        const key = `${focusedTrack.participant.identity}-${focusedTrack.source}`;
        const publication = focusedTrack.publication;
        const isPaused = pausedKeys.has(key);
        if (publication instanceof RemoteTrackPublication) {
            publication.setSubscribed(isPaused);
        }
        setPausedKeys((prev) => {
            const next = new Set(prev);
            if (isPaused) next.delete(key);
            else next.add(key);
            return next;
        });
    };

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
        const focusedKeyStr = `${focusedTrack.participant.identity}-${focusedTrack.source}`;
        const isPaused = pausedKeys.has(focusedKeyStr);
        const isLocalShare = focusedTrack.participant.isLocal;
        const volumeKey = getScreenShareVolumeKey(focusedTrack.participant.identity);
        const volumeMuted = isMuted(volumeKey);

        return (
            <div className="flex flex-col lg:flex-row h-full p-2 gap-2">
                <div id={focusId} className="flex-1 bg-black rounded-lg overflow-hidden relative group">
                    {isPaused ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-4">
                            <EyeOff size={32} className="text-[#63656B]" />
                            <p className="text-sm text-[#8B8D93]">
                                Você parou de assistir a transmissão de {focusedTrack.participant.name || focusedTrack.participant.identity}
                            </p>
                            <button
                                onClick={toggleWatching}
                                className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#FF7D5F] text-[#0F1012] font-semibold text-sm py-2 px-4 rounded-xl transition-colors"
                            >
                                <Eye size={16} />
                                Voltar a assistir
                            </button>
                        </div>
                    ) : (
                        <CustomParticipantTile trackRef={focusedTrack} className="object-contain" />
                    )}
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                        {!isLocalShare && !isPaused && (
                            <div className="relative" ref={volumeRef}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setVolumeOpen((v) => !v);
                                    }}
                                    className={`p-2 bg-black/60 hover:bg-black/90 rounded text-white shadow-lg ${volumeMuted ? 'text-[#F2555A]' : ''}`}
                                    title="Volume da transmissão"
                                >
                                    {volumeMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </button>
                                {volumeOpen && (
                                    <ParticipantVolumePanel
                                        volumeKey={volumeKey}
                                        name={`Transmissão de ${focusedTrack.participant.name || focusedTrack.participant.identity}`}
                                        muteLabel="Mutar transmissão apenas para mim"
                                        className="absolute top-full right-0 mt-2 w-52"
                                    />
                                )}
                            </div>
                        )}
                        {!isLocalShare && (
                            <button
                                onClick={toggleWatching}
                                className="p-2 bg-black/60 hover:bg-black/90 rounded text-white shadow-lg"
                                title={isPaused ? 'Voltar a assistir' : 'Parar de assistir'}
                            >
                                {isPaused ? <Eye size={20} /> : <EyeOff size={20} />}
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTheaterModeChange(!theaterMode);
                            }}
                            className="p-2 bg-black/60 hover:bg-black/90 rounded text-white shadow-lg"
                            title={theaterMode ? 'Mostrar painéis' : 'Ampliar (ocultar painéis)'}
                        >
                            {theaterMode ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
                        </button>
                        {!isPaused && (
                            <button
                                onClick={(e) => toggleFullscreen(e, focusId)}
                                className="p-2 bg-black/60 hover:bg-black/90 rounded text-white shadow-lg"
                                title="Tela cheia"
                            >
                                <Maximize size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {!theaterMode && (
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
                )}
            </div>
        );
    }

    return (
        <GridLayout tracks={tracks} className="p-4 gap-4 h-full">
            <CustomParticipantTile />
        </GridLayout>
    );
}