'use client';

import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppContext';
import { FriendsSidebar } from './FriendsSidebar';
import { FriendsView } from './FriendsView';
import { useFriendsData } from './useFriendsData';

export function FriendsShell() {
    const { activeParticipants } = useAppContext();
    const { data, loading, loadError, refresh } = useFriendsData();

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
        <>
            <FriendsSidebar friends={friends} onlineIds={onlineIds} />
            <FriendsView
                friends={friends}
                incomingRequests={data?.incomingRequests ?? []}
                outgoingRequests={data?.outgoingRequests ?? []}
                onRefresh={refresh}
            />
        </>
    );
}
