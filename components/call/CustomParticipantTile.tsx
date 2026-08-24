'use client';

import { Track } from 'livekit-client';
import {
    ParticipantTile,
    ParticipantName,
    TrackMutedIndicator,
    VideoTrack,
    AudioTrack,
    isTrackReference,
    useEnsureTrackRef,
    type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { ScreenShare } from 'lucide-react';
import { cn } from '@/lib/utils';

function ParticipantAvatar({ name }: { name?: string }) {
    const initial = (name || '?').trim()[0]?.toUpperCase() || '?';
    return (
        <div className="w-16 h-16 rounded-full bg-[#2A2D35] flex items-center justify-center text-2xl font-semibold text-[#EDEBE7] shrink-0">
            {initial}
        </div>
    );
}

interface CustomParticipantTileProps {
    trackRef?: TrackReferenceOrPlaceholder;
    className?: string;
}

export function CustomParticipantTile({ trackRef, className }: CustomParticipantTileProps) {
    const trackReference = useEnsureTrackRef(trackRef);

    const isVideo =
        isTrackReference(trackReference) &&
        (trackReference.publication?.kind === 'video' ||
            trackReference.source === Track.Source.Camera ||
            trackReference.source === Track.Source.ScreenShare);

    return (
        <ParticipantTile trackRef={trackReference} className={cn('w-full h-full', className)}>
            {isVideo ? (
                <VideoTrack trackRef={trackReference} />
            ) : (
                isTrackReference(trackReference) && <AudioTrack trackRef={trackReference} />
            )}
            <div className="lk-participant-placeholder">
                <ParticipantAvatar name={trackReference.participant.name || trackReference.participant.identity} />
            </div>
            <div className="lk-participant-metadata">
                <div className="lk-participant-metadata-item">
                    {trackReference.source === Track.Source.Camera ? (
                        <>
                            <TrackMutedIndicator
                                trackRef={{ participant: trackReference.participant, source: Track.Source.Microphone }}
                                show="muted"
                            />
                            <ParticipantName />
                        </>
                    ) : (
                        <>
                            <ScreenShare size={14} style={{ marginRight: '0.25rem' }} />
                            <ParticipantName>&apos;s screen</ParticipantName>
                        </>
                    )}
                </div>
            </div>
        </ParticipantTile>
    );
}
