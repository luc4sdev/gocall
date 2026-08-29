'use client';

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { Participant } from 'livekit-client';
import type { ChannelDTO } from '@/lib/types';
import type { VoiceControlState } from '@/components/call/VoiceRoomBridge';
import type { ScreenShareThumbnail } from '@/components/layout/ScreenShareThumbnailBridge';
import type { PrivateCallState } from '@/components/call/usePrivateCall';

export interface ScreenShareViewState {
    pausedKeys: Set<string>;
    seenKeys: Set<string>;
    focusedKey: string | null;
}

export interface AppContextValue {
    username: string;
    localIdentity: string;
    activeParticipants: Participant[];
    voiceChannel: ChannelDTO | null;
    voiceState: VoiceControlState | null;
    theaterMode: boolean;
    onTheaterModeChange: (next: boolean) => void;
    onJoinVoice: (channel: ChannelDTO) => Promise<boolean>;
    onLeaveVoice: () => void;
    localThumbnail: string | null;
    screenShareThumbnails: Map<string, ScreenShareThumbnail>;
    screenShareViewState: ScreenShareViewState;
    setScreenShareViewState: Dispatch<SetStateAction<ScreenShareViewState>>;
    skipAutoPauseOnJoin: boolean;
    setSkipAutoPauseOnJoin: (next: boolean) => void;
    registerVoiceRoomSlot: (channelId: string, el: HTMLDivElement | null) => void;
    registerVoiceParticipantsSlot: (el: HTMLDivElement | null) => void;
    unreadDmFriendIds: Set<string>;
    seedUnreadDmFriendIds: (friendIds: string[]) => void;
    markDmRead: (friendId: string) => void;
    friendIds: Set<string>;
    setFriendIds: (friendIds: string[]) => void;
    privateCall: PrivateCallState | null;
    startPrivateCall: (friend: { id: string; username: string }) => void;
    acceptPrivateCall: () => void;
    declinePrivateCall: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
    const ctx = useContext(AppContext);
    if (!ctx) {
        throw new Error('useAppContext precisa ser usado dentro de <AppShell>');
    }
    return ctx;
}
