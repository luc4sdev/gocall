'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FriendDTO, FriendRequestDTO } from '@/lib/types';

export interface FriendsData {
    friends: FriendDTO[];
    incomingRequests: FriendRequestDTO[];
    outgoingRequests: FriendRequestDTO[];
}

export function useFriendsData() {
    const [data, setData] = useState<FriendsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const refresh = useCallback(async () => {
        try {
            const res = await fetch('/api/friends');
            const json = await res.json();
            if (!res.ok) {
                setLoadError(json.error || 'Não foi possível carregar amigos.');
                return;
            }
            setData(json);
            setLoadError('');
        } catch {
            setLoadError('Falha na conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refresh();
    }, [refresh]);

    return { data, loading, loadError, refresh };
}
