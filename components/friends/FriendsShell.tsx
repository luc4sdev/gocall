'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppContext';
import { FriendsContext } from './FriendsContext';
import { FriendsSidebar } from './FriendsSidebar';
import { FriendsCallSidebar } from './FriendsCallSidebar';
import { useFriendsData } from './useFriendsData';

export function FriendsShell({ children }: { children: React.ReactNode }) {
    const { activeParticipants, seedUnreadDmFriendIds, setFriendIds } = useAppContext();
    const { data, loading, loadError, refresh } = useFriendsData();

    useEffect(() => {
        const unreadIds = (data?.friends ?? []).filter((f) => f.hasUnread).map((f) => f.id);
        if (unreadIds.length > 0) seedUnreadDmFriendIds(unreadIds);
    }, [data, seedUnreadDmFriendIds]);

    useEffect(() => {
        if (data) setFriendIds(data.friends.map((f) => f.id));
    }, [data, setFriendIds]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center text-[#8B8D93]">
                <Loader2 className="animate-spin" size={20} />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex-1 flex items-center justify-center text-center px-4">
                <p className="text-sm text-[#F2555A]">{loadError}</p>
            </div>
        );
    }

    const friends = data?.friends ?? [];
    const onlineIds = new Set(activeParticipants.map((p) => p.identity));

    return (
        <FriendsContext.Provider
            value={{
                friends,
                incomingRequests: data?.incomingRequests ?? [],
                outgoingRequests: data?.outgoingRequests ?? [],
                refresh,
            }}
        >
            <FriendsSidebar friends={friends} onlineIds={onlineIds} />
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0F1012]">
                {children}
            </div>
            <FriendsCallSidebar friends={friends} />
        </FriendsContext.Provider>
    );
}
