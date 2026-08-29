'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Phone } from 'lucide-react';
import { useAppContext } from '@/components/AppContext';
import { UserControlBar } from '@/components/layout/UserControlBar';
import type { FriendDTO } from '@/lib/types';

interface FriendsSidebarProps {
    friends: FriendDTO[];
    onlineIds: Set<string>;
}

export function FriendsSidebar({ friends, onlineIds }: FriendsSidebarProps) {
    const { unreadDmFriendIds, voiceChannel, privateCall, startPrivateCall } = useAppContext();
    const params = useParams<{ friendId?: string }>();
    const activeFriendId = params?.friendId ?? '';
    const busy = !!voiceChannel || !!privateCall;

    const sorted = [...friends].sort((a, b) => {
        const aOnline = onlineIds.has(a.id);
        const bOnline = onlineIds.has(b.id);
        if (aOnline !== bOnline) return aOnline ? -1 : 1;
        return a.username.localeCompare(b.username);
    });

    return (
        <div className="hidden lg:flex w-64 bg-[#16171A] flex-col shrink-0">
            <div className="h-14 px-4 flex items-center shrink-0 border-b border-white/4">
                <span className="font-display font-semibold text-[15px] tracking-tight truncate">
                    Amigos — {friends.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-4">
                {sorted.length === 0 ? (
                    <p className="text-sm text-[#63656B] px-3">Você ainda não tem amigos.</p>
                ) : (
                    sorted.map((friend) => {
                        const online = onlineIds.has(friend.id);
                        const active = activeFriendId === friend.id;
                        const hasUnread = unreadDmFriendIds.has(friend.id);
                        return (
                            <div
                                key={friend.friendshipId}
                                className={`group flex items-center gap-1 rounded-lg min-w-0 transition-colors ${active ? 'bg-white/6' : 'hover:bg-white/3'
                                    }`}
                            >
                                <Link
                                    href={`/friends/${friend.id}`}
                                    className="flex-1 min-w-0 flex items-center gap-2.5 pl-3 pr-1 py-1.5"
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium">
                                            {friend.username[0]?.toUpperCase()}
                                        </div>
                                        <div
                                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#16171A] ${online ? 'bg-emerald-500' : 'bg-[#63656B]'
                                                }`}
                                        />
                                    </div>
                                    <span className={`text-[14px] truncate flex-1 min-w-0 ${hasUnread ? 'font-semibold text-[#EDEBE7]' : online ? 'text-[#EDEBE7]' : 'text-[#8B8D93]'}`}>
                                        {friend.username}
                                    </span>
                                    {hasUnread && <span className="w-2 h-2 rounded-full bg-brand shrink-0" />}
                                </Link>
                                {online && (
                                    <button
                                        onClick={() => startPrivateCall(friend)}
                                        disabled={busy}
                                        title={busy ? 'Você já está em uma chamada' : `Ligar para ${friend.username}`}
                                        className="shrink-0 mr-1.5 p-1.5 rounded-lg text-[#63656B] opacity-0 group-hover:opacity-100 hover:bg-emerald-500/15 hover:text-emerald-500 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                                    >
                                        <Phone size={14} />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <UserControlBar />
        </div>
    );
}
