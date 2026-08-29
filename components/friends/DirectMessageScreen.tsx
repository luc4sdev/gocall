'use client';

import Link from 'next/link';
import { ArrowLeft, Phone } from 'lucide-react';
import { useAppContext } from '@/components/AppContext';
import { VoiceRoomSlot } from '@/components/call/VoiceRoomSlot';
import { privateCallChannelId } from '@/components/call/usePrivateCall';
import { DirectMessageView } from './DirectMessageView';
import type { FriendDTO } from '@/lib/types';

export function DirectMessageScreen({ friend }: { friend: Pick<FriendDTO, 'id' | 'username'> }) {
    const { voiceChannel, privateCall, theaterMode, startPrivateCall } = useAppContext();

    const isActiveCallWithFriend = privateCall?.status === 'active' && privateCall.peerId === friend.id
        && voiceChannel?.id === privateCallChannelId(privateCall.callId);
    const busy = !!voiceChannel || !!privateCall;

    if (isActiveCallWithFriend) {
        return (
            <>
                {!theaterMode && (
                    <div className="h-14 px-3 sm:px-5 flex items-center min-w-0 gap-2 border-b border-white/4 bg-[#16171A] shrink-0 z-10">
                        <Link
                            href="/friends"
                            className="p-1.5 -ml-1.5 rounded-lg text-[#8B8D93] hover:bg-white/5 hover:text-[#EDEBE7] transition-colors shrink-0"
                            title="Voltar para amigos"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="w-7 h-7 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium shrink-0">
                            {friend.username[0]?.toUpperCase()}
                        </div>
                        <span className="font-display font-semibold text-[15px] truncate min-w-0">{friend.username}</span>
                    </div>
                )}
                <VoiceRoomSlot channelId={privateCallChannelId(privateCall.callId)} />
            </>
        );
    }

    return (
        <>
            <div className="h-14 px-3 sm:px-5 flex items-center min-w-0 gap-2 border-b border-white/4 bg-[#16171A] shrink-0 z-10">
                <Link
                    href="/friends"
                    className="p-1.5 -ml-1.5 rounded-lg text-[#8B8D93] hover:bg-white/5 hover:text-[#EDEBE7] transition-colors shrink-0"
                    title="Voltar para amigos"
                >
                    <ArrowLeft size={18} />
                </Link>
                <div className="w-7 h-7 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium shrink-0">
                    {friend.username[0]?.toUpperCase()}
                </div>
                <span className="font-display font-semibold text-[15px] truncate min-w-0 flex-1">{friend.username}</span>
                <button
                    onClick={() => startPrivateCall(friend)}
                    disabled={busy}
                    title={busy ? 'Você já está em uma chamada' : `Ligar para ${friend.username}`}
                    className="shrink-0 p-2 rounded-lg text-[#8B8D93] hover:bg-emerald-500/15 hover:text-emerald-500 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                    <Phone size={17} />
                </button>
            </div>
            <DirectMessageView friend={friend} />
        </>
    );
}
