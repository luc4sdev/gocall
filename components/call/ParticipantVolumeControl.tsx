'use client';

import { useEffect, useRef } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { useParticipantAudio } from './ParticipantAudioContext';
import { ParticipantVolumePanel } from './ParticipantVolumePanel';

interface ParticipantVolumeControlProps {
    identity: string;
    name: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ParticipantVolumeControl({ identity, name, open, onOpenChange }: ParticipantVolumeControlProps) {
    const { getVolume, isMuted } = useParticipantAudio();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onOpenChange(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, onOpenChange]);

    const muted = isMuted(identity);
    const volume = getVolume(identity);
    const VolumeIcon = muted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
        <div ref={containerRef} className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
            <button
                onClick={() => onOpenChange(!open)}
                className={`p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors ${muted ? 'text-[#F2555A]' : 'text-white'}`}
                title={`Volume de ${name}`}
            >
                <VolumeIcon size={14} />
            </button>

            {open && (
                <ParticipantVolumePanel identity={identity} name={name} className="absolute top-full right-0 mt-2 w-48" />
            )}
        </div>
    );
}
