'use client';

import { useCallback } from 'react';
import { useAppContext } from '@/components/AppContext';

export function VoiceRoomSlot({ channelId }: { channelId: string }) {
    const { registerVoiceRoomSlot } = useAppContext();
    const refCallback = useCallback(
        (el: HTMLDivElement | null) => registerVoiceRoomSlot(channelId, el),
        [channelId, registerVoiceRoomSlot]
    );
    return <div ref={refCallback} className="flex-1 flex flex-col min-h-0" />;
}
