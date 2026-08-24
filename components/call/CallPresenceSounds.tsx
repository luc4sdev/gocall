'use client';

import { useEffect, useRef } from 'react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { playSound } from '@/lib/utils';

export function CallPresenceSounds() {
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
    const knownInCallRef = useRef<Set<string> | null>(null);
    const knownSharingRef = useRef<Set<string> | null>(null);

    useEffect(() => {
        const remoteParticipants = participants.filter((p) => p.identity !== localParticipant.identity);

        const currentInCall = new Set(remoteParticipants.map((p) => p.identity));
        const previousInCall = knownInCallRef.current;
        if (previousInCall) {
            for (const identity of currentInCall) {
                if (!previousInCall.has(identity)) playSound('join');
            }
            for (const identity of previousInCall) {
                if (!currentInCall.has(identity)) playSound('leave');
            }
        }
        knownInCallRef.current = currentInCall;

        const currentSharing = new Set(
            remoteParticipants.filter((p) => p.isScreenShareEnabled).map((p) => p.identity)
        );
        const previousSharing = knownSharingRef.current;
        if (previousSharing) {
            for (const identity of currentSharing) {
                if (!previousSharing.has(identity)) playSound('screenshare-start');
            }
            for (const identity of previousSharing) {
                if (!currentSharing.has(identity)) playSound('screenshare-stop');
            }
        }
        knownSharingRef.current = currentSharing;
    }, [participants, localParticipant.identity]);

    return null;
}
