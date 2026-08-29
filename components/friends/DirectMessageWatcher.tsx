'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@livekit/components-react';
import { notify } from '@/lib/toast';
import { getDmNotificationSoundPreference, getDmToastPreference, playSound } from '@/lib/utils';

interface DirectMessageWatcherProps {
    localIdentity: string;
    openFriendId: string | null;
    friendIdsRef: RefObject<Set<string>>;
    onUnread: (friendId: string) => void;
}

const PREVIEW_MAX_LENGTH = 160;


export function DirectMessageWatcher({ localIdentity, openFriendId, friendIdsRef, onUnread }: DirectMessageWatcherProps) {
    const { chatMessages } = useChat();
    const router = useRouter();
    const seenRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!localIdentity) return;

        for (const m of chatMessages) {
            if (seenRef.current.has(m.id)) continue;
            seenRef.current.add(m.id);

            const recipientId = m.attributes?.recipientId;
            if (!recipientId || recipientId !== localIdentity) continue;

            const senderId = m.from?.identity;
            if (!senderId || senderId === localIdentity) continue;

            if (!friendIdsRef.current.has(senderId)) continue;

            if (openFriendId === senderId) continue;

            onUnread(senderId);

            if (getDmNotificationSoundPreference()) playSound('message');

            if (getDmToastPreference()) {
                const senderName = m.from?.name || senderId;
                const preview = m.message.length > PREVIEW_MAX_LENGTH
                    ? `${m.message.slice(0, PREVIEW_MAX_LENGTH)}…`
                    : m.message;
                notify.info(`${senderName}: ${preview}`, {
                    className: 'cursor-pointer',
                    onClick: () => router.push(`/friends/${senderId}`),
                });
            }
        }
    }, [chatMessages, localIdentity, openFriendId, friendIdsRef, onUnread, router]);

    return null;
}
