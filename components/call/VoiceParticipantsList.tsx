'use client';

import { useState } from 'react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { MicOff, Volume2, VolumeX, Radio } from 'lucide-react';
import { useParticipantAudio } from './ParticipantAudioContext';
import { ParticipantVolumePanel } from './ParticipantVolumePanel';

function LiveBadge() {
    return (
        <span className="flex items-center gap-1 shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#F2555A] bg-[#F2555A]/10 px-1.5 py-0.5 rounded">
            <Radio size={10} />
            Ao vivo
        </span>
    );
}

export function VoiceParticipantsList() {
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
    const { isMuted } = useParticipantAudio();
    const [openVolumeIdentity, setOpenVolumeIdentity] = useState<string | null>(null);

    const others = participants.filter((p) => p.identity !== localParticipant.identity);

    return (
        <>
            {others.map((p) => {
                const isOpen = openVolumeIdentity === p.identity;
                const muted = isMuted(p.identity);
                return (
                    <div key={p.identity}>
                        <div
                            onClick={() => setOpenVolumeIdentity((prev) => (prev === p.identity ? null : p.identity))}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/3 cursor-pointer"
                        >
                            <div className="relative shrink-0">
                                <div
                                    className={`w-7 h-7 rounded-full bg-[#2A2D35] flex items-center justify-center text-[11px] font-medium overflow-hidden transition-shadow ${p.isSpeaking ? 'ring-2 ring-[#4ADE80] ring-offset-2 ring-offset-[#16171A] animate-pulse' : ''
                                        }`}
                                >
                                    {p.name?.[0]?.toUpperCase() || p.identity?.[0]?.toUpperCase()}
                                </div>
                                {!p.isMicrophoneEnabled && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#16171A] rounded-full flex items-center justify-center">
                                        <MicOff size={9} className="text-[#8B8D93]" />
                                    </div>
                                )}
                            </div>
                            <span className="text-[13px] text-[#B4B6BB] truncate flex-1 min-w-0">
                                {p.name || p.identity}
                            </span>
                            {p.isScreenShareEnabled && <LiveBadge />}
                            {muted ? (
                                <VolumeX size={14} className="text-[#F2555A] shrink-0" />
                            ) : (
                                <Volume2 size={14} className="text-[#63656B] shrink-0" />
                            )}
                        </div>
                        {isOpen && (
                            <div className="px-3 pb-2 pt-1">
                                <ParticipantVolumePanel volumeKey={p.identity} name={p.name || p.identity} />
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}
