'use client';

import { createContext, useContext } from 'react';
import type { FriendDTO, FriendRequestDTO } from '@/lib/types';

export interface FriendsContextValue {
    friends: FriendDTO[];
    incomingRequests: FriendRequestDTO[];
    outgoingRequests: FriendRequestDTO[];
    refresh: () => Promise<void>;
}

export const FriendsContext = createContext<FriendsContextValue | null>(null);

export function useFriendsContext(): FriendsContextValue {
    const ctx = useContext(FriendsContext);
    if (!ctx) {
        throw new Error('useFriendsContext precisa ser usado dentro de <FriendsShell>');
    }
    return ctx;
}
