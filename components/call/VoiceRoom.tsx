'use client';

import {
    LiveKitRoom,
    RoomAudioRenderer,
    ControlBar,
    GridLayout,
    ParticipantTile,
    useTracks,
    useParticipants
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { useEffect } from 'react';
import { Maximize } from 'lucide-react';

interface VoiceRoomProps {
    token: string;
    serverUrl: string;
    onDisconnected: () => void;
    onParticipantsChange: (participants: any[]) => void;
}

function ParticipantsSpy({ onChange }: { onChange: (p: any[]) => void }) {
    const participants = useParticipants();

    useEffect(() => {
        onChange(participants);
    }, [participants, onChange]);

    return null; // Ele não desenha nada na tela
}

function playDiscordSound(type: 'join' | 'leave') {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';

        const now = ctx.currentTime;
        if (type === 'join') {
            osc.frequency.setValueAtTime(440, now); // Nota mais grave
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // Vai pra aguda
        } else {
            osc.frequency.setValueAtTime(880, now); // Nota mais aguda
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.1); // Cai pra grave
        }

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.15);
    } catch (e) {
        console.error("Áudio bloqueado pelo navegador");
    }
}

export function VoiceRoom({ token, serverUrl, onDisconnected, onParticipantsChange }: VoiceRoomProps) {

    useEffect(() => {
        playDiscordSound('join');
        return () => playDiscordSound('leave');
    }, []);
    if (!token || !serverUrl) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#000000]">
            <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                serverUrl={serverUrl}
                onDisconnected={onDisconnected}
                data-lk-theme="default"
                className="flex-1 flex flex-col"
            >
                <ParticipantsSpy onChange={onParticipantsChange} />

                <RoomAudioRenderer />


                <div className="flex-1 min-h-0 relative">
                    <CustomVideoGrid />
                </div>

                <div className="h-20 bg-[#1E1F22] border-t border-[#1e1f22] flex items-center justify-center shrink-0">
                    <ControlBar
                        controls={{
                            camera: true,
                            microphone: true,
                            screenShare: true,
                            chat: false,
                            leave: true
                        }}
                    />
                </div>

            </LiveKitRoom>
        </div>
    );
}


function CustomVideoGrid() {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false }
    );

    const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare);

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

    // Se tem tela compartilhada, renderiza o Layout em Foco
    if (screenShareTrack) {
        return (
            <div className="flex flex-col lg:flex-row h-full p-2 gap-2">
                {/* TELA PRINCIPAL (EM FOCO) */}
                <div id="focus-screen" className="flex-1 bg-black rounded-lg overflow-hidden relative group">
                    <ParticipantTile trackRef={screenShareTrack} className="w-full h-full object-contain" />

                    {/* BOTÃO DE TELA CHEIA */}
                    <button
                        onClick={(e) => toggleFullscreen(e, "focus-screen")}
                        className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 rounded text-white opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg"
                        title="Tela Cheia"
                    >
                        <Maximize size={20} />
                    </button>
                </div>

                {/* OUTROS PARTICIPANTES (Sidebar lateral ou embaixo no mobile) */}
                <div className="w-full lg:w-64 h-32 lg:h-full flex flex-row lg:flex-col gap-2 overflow-auto">
                    {tracks.filter(t => t !== screenShareTrack).map(t => (
                        <div key={t.participant.identity + t.source} className="w-48 lg:w-full h-full lg:h-48 shrink-0 bg-[#1E1F22] rounded-lg overflow-hidden border border-[#313338]">
                            <ParticipantTile trackRef={t} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <GridLayout
            tracks={tracks}
            className="p-4 gap-4 h-full"
        >
            <ParticipantTile />
        </GridLayout>
    );
}