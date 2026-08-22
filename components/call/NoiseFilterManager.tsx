'use client';

import { useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import type { LocalAudioTrack } from 'livekit-client';
import { applyNoiseFilter } from '@/lib/utils';

export function NoiseFilterManager() {
    const { isMicrophoneEnabled, microphoneTrack } = useLocalParticipant();

    useEffect(() => {
        if (!isMicrophoneEnabled) return;
        applyNoiseFilter(microphoneTrack?.track as LocalAudioTrack | undefined);
    }, [isMicrophoneEnabled, microphoneTrack]);

    return null;
}
