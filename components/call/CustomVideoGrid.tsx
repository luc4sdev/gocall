import { isTrackReference, useTracks } from '@livekit/components-react';
import { RemoteTrackPublication, Track } from 'livekit-client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Maximize, PanelRightClose, PanelRightOpen, Volume2, VolumeX } from 'lucide-react';
import { GridLayout } from '@livekit/components-react';
import { useAppContext } from '@/components/AppContext';
import { CustomParticipantTile } from './CustomParticipantTile';
import { getScreenShareVolumeKey, useParticipantAudio } from './ParticipantAudioContext';
import { ParticipantVolumePanel } from './ParticipantVolumePanel';
import { Button } from '../ui/button';

interface CustomVideoGridProps {
    theaterMode: boolean;
    onTheaterModeChange: (next: boolean) => void;
    skipAutoPause?: boolean;
}

export function CustomVideoGrid({ theaterMode, onTheaterModeChange, skipAutoPause = false }: CustomVideoGridProps) {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false }
    );

    const screenShareTracks = useMemo(
        () => tracks.filter(t => t.source === Track.Source.ScreenShare),
        [tracks]
    );

    const { screenShareViewState, setScreenShareViewState, screenShareThumbnails } = useAppContext();
    const { pausedKeys, seenKeys: seenScreenShareKeys, focusedKey } = screenShareViewState;

    const setPausedKeys = (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
        setScreenShareViewState((prev) => ({
            ...prev,
            pausedKeys: typeof updater === 'function' ? updater(prev.pausedKeys) : updater,
        }));
    };
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

    const remoteScreenShareKeys = useMemo(
        () => new Set(
            screenShareTracks.filter((t) => !t.participant.isLocal).map((t) => `${t.participant.identity}-${t.source}`)
        ),
        [screenShareTracks]
    );

    useEffect(() => {
        const isInitialBatch = seenScreenShareKeys.size === 0;
        const newScreenShareKeys = [...remoteScreenShareKeys].filter((k) => !seenScreenShareKeys.has(k));
        if (newScreenShareKeys.length === 0) return;

        setScreenShareViewState((prev) => {
            const nextSeen = new Set(prev.seenKeys);
            for (const key of remoteScreenShareKeys) nextSeen.add(key);

            let nextPaused = prev.pausedKeys;
            if (!(isInitialBatch && skipAutoPause)) {
                nextPaused = new Set(prev.pausedKeys);
                for (const key of newScreenShareKeys) nextPaused.add(key);
            }

            return { ...prev, seenKeys: nextSeen, pausedKeys: nextPaused };
        });
    }, [remoteScreenShareKeys, seenScreenShareKeys, skipAutoPause, setScreenShareViewState]);

    useEffect(() => {
        for (const t of screenShareTracks) {
            if (!isTrackReference(t)) continue;
            const key = `${t.participant.identity}-${t.source}`;
            const shouldBeSubscribed = !pausedKeys.has(key);

            const videoPublication = t.publication;
            if (videoPublication instanceof RemoteTrackPublication) {
                videoPublication.setSubscribed(shouldBeSubscribed);
            }
            t.participant.audioTrackPublications.forEach((pub) => {
                if (pub.source === Track.Source.ScreenShareAudio && pub instanceof RemoteTrackPublication) {
                    pub.setSubscribed(shouldBeSubscribed);
                }
            });
        }
    }, [screenShareTracks, pausedKeys]);

    const screenShareTracksRef = useRef(screenShareTracks);
    useEffect(() => {
        screenShareTracksRef.current = screenShareTracks;
    }, [screenShareTracks]);

    const pendingUnsubscribeAllRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (pendingUnsubscribeAllRef.current !== null) {
            clearTimeout(pendingUnsubscribeAllRef.current);
            pendingUnsubscribeAllRef.current = null;
        }

        return () => {
            pendingUnsubscribeAllRef.current = setTimeout(() => {
                pendingUnsubscribeAllRef.current = null;

                const remoteTracks = screenShareTracksRef.current.filter((t) => !t.participant.isLocal);
                if (remoteTracks.length === 0) return;

                for (const t of remoteTracks) {
                    if (!isTrackReference(t)) continue;
                    const videoPublication = t.publication;
                    if (videoPublication instanceof RemoteTrackPublication) {
                        videoPublication.setSubscribed(false);
                    }
                    t.participant.audioTrackPublications.forEach((pub) => {
                        if (pub.source === Track.Source.ScreenShareAudio && pub instanceof RemoteTrackPublication) {
                            pub.setSubscribed(false);
                        }
                    });
                }

                const remoteKeys = remoteTracks.map((t) => `${t.participant.identity}-${t.source}`);
                setScreenShareViewState((prev) => ({
                    ...prev,
                    pausedKeys: new Set([...prev.pausedKeys, ...remoteKeys]),
                }));
            }, 0);
        };
    }, [setScreenShareViewState]);

    const focusedTrack = useMemo(() => {
        if (screenShareTracks.length === 0) return undefined;
        const match = screenShareTracks.find(t => `${t.participant.identity}-${t.source}` === focusedKey);
        return match ?? screenShareTracks[0];
    }, [screenShareTracks, focusedKey]);

    const handleSelectFocus = (key: string) => {
        setScreenShareViewState((prev) => {
            const nextPaused = new Set(prev.pausedKeys);
            if (prev.focusedKey && prev.focusedKey !== key) {
                nextPaused.add(prev.focusedKey);
            }
            nextPaused.delete(key);
            return { ...prev, focusedKey: key, pausedKeys: nextPaused };
        });
    };

    const toggleWatching = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!focusedTrack || !isTrackReference(focusedTrack)) return;
        const key = `${focusedTrack.participant.identity}-${focusedTrack.source}`;
        const isPaused = pausedKeys.has(key);

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
                                Transmissão de {focusedTrack.participant.name || focusedTrack.participant.identity} pausada.
                            </p>
                            <Button
                                onClick={toggleWatching}
                                className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-[#0F1012] font-semibold text-sm py-2 px-4 rounded-xl transition-colors"
                            >
                                <Eye size={16} />
                                Assistir
                            </Button>
                        </div>
                    ) : (
                        <CustomParticipantTile trackRef={focusedTrack} className="object-contain" />
                    )}
                    <div className="absolute top-2 right-2 lg:top-4 lg:right-4 flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all z-10">
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
                                const thumbnail = isScreenShare ? screenShareThumbnails.get(t.participant.identity) : undefined;
                                const isPausedShare = isScreenShare && pausedKeys.has(key);

                                return (
                                    <div
                                        key={key}
                                        onClick={() => isScreenShare && handleSelectFocus(key)}
                                        className={`relative w-48 lg:w-full h-full lg:h-48 shrink-0 bg-[#1E1F23] rounded-lg overflow-hidden border transition-colors ${isScreenShare ? 'border-brand/40 hover:border-brand cursor-pointer' : 'border-white/6'
                                            }`}
                                        title={isScreenShare ? 'Clique para assistir esta transmissão' : undefined}
                                    >
                                        {isPausedShare && thumbnail ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={thumbnail.dataUrl} alt="" className="w-full h-full object-cover opacity-70" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                    <Eye size={20} className="text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <CustomParticipantTile trackRef={t} />
                                        )}
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
