'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useParticipantAudio } from './ParticipantAudioContext';

interface ParticipantVolumePanelProps {
    volumeKey: string;
    name: string;
    className?: string;
    muteLabel?: string;
}

export function ParticipantVolumePanel({ volumeKey, name, className, muteLabel = 'Mutar apenas para mim' }: ParticipantVolumePanelProps) {
    const { getVolume, setVolume, isMuted, toggleMute } = useParticipantAudio();

    const muted = isMuted(volumeKey);
    const volume = getVolume(volumeKey);

    return (
        <div
            className={`w-full bg-[#1F2023] border border-white/8 rounded-xl shadow-xl p-3 flex flex-col gap-2.5 ${className ?? ''}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-[#EDEBE7] truncate">{name}</span>
                <button
                    onClick={() => toggleMute(volumeKey)}
                    className={`shrink-0 p-1.5 rounded-lg transition-colors ${muted ? 'text-[#F2555A] bg-[#F2555A]/10 hover:bg-[#F2555A]/15' : 'text-[#8B8D93] hover:bg-white/5 hover:text-[#EDEBE7]'
                        }`}
                    title={muted ? 'Desmutar' : muteLabel}
                >
                    {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(volume * 100)}
                disabled={muted}
                onChange={(e) => setVolume(volumeKey, Number(e.target.value) / 100)}
                className="w-full accent-[#FF6B4A] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-[11px] text-[#63656B] text-right">
                {muted ? 'Mutado para você' : `${Math.round(volume * 100)}%`}
            </span>
        </div>
    );
}
