'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2, Radio } from 'lucide-react';
import type { Participant } from 'livekit-client';
import { useAppContext } from '@/components/AppContext';
import { notify } from '@/lib/toast';
import type { ChannelDTO, FriendDTO } from '@/lib/types';

interface FriendsCallSidebarProps {
    friends: FriendDTO[];
}

function LiveBadge() {
    return (
        <span className="flex items-center gap-1 shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#F2555A] bg-[#F2555A]/10 px-1.5 py-0.5 rounded">
            <Radio size={10} />
            Ao vivo
        </span>
    );
}

export function FriendsCallSidebar({ friends }: FriendsCallSidebarProps) {
    const router = useRouter();
    const { activeParticipants, localIdentity, screenShareThumbnails, onJoinVoice, setSkipAutoPauseOnJoin } = useAppContext();
    const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);

    const friendIds = new Set(friends.map((f) => f.id));
    const friendsInCall = activeParticipants.filter(
        (p) => p.identity !== localIdentity && friendIds.has(p.identity) && p.attributes?.inCall === 'true'
    );

    const groups = new Map<string, Participant[]>();
    for (const p of friendsInCall) {
        const channelId = p.attributes?.voiceChannelId;
        if (!channelId) continue;
        const group = groups.get(channelId);
        if (group) group.push(p);
        else groups.set(channelId, [p]);
    }

    const handleJoin = async (channelId: string) => {
        setJoiningChannelId(channelId);
        try {
            const res = await fetch(`/api/channels/${channelId}`);
            const data = await res.json();
            if (!res.ok) {
                notify.error(data.error || 'Não foi possível entrar na chamada.');
                return;
            }
            const channel: ChannelDTO = data.channel;
            router.push(`/servers/${channel.serverId}/channels/${channel.id}`);
            setSkipAutoPauseOnJoin(true);
            const joined = await onJoinVoice(channel);
            if (!joined) notify.error('Não foi possível entrar na chamada.');
        } catch {
            notify.error('Falha na conexão com o servidor.');
        } finally {
            setJoiningChannelId(null);
        }
    };

    return (
        <div className="hidden lg:flex w-60 bg-[#16171A] flex-col shrink-0 border-l border-white/4">
            <div className="h-14 px-4 flex items-center shrink-0 border-b border-white/4">
                <span className="font-display font-semibold text-[13px] text-[#8B8D93] uppercase tracking-wider">
                    Em chamada — {friendsInCall.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-4">
                {groups.size === 0 ? (
                    <p className="text-sm text-[#63656B] px-3">Nenhum amigo em chamada agora.</p>
                ) : (
                    Array.from(groups.entries()).map(([channelId, members]) => {
                        const isJoining = joiningChannelId === channelId;
                        return (
                            <div key={channelId} className="mb-3 last:mb-0 flex flex-col gap-1">
                                {members
                                    .sort((a, b) => Number(b.attributes?.screenSharing === 'true') - Number(a.attributes?.screenSharing === 'true'))
                                    .map((p) => {
                                        const name = p.name || p.identity;
                                        const thumbnail = screenShareThumbnails.get(p.identity);
                                        const isScreenSharing = p.attributes?.screenSharing === 'true';

                                        if (isScreenSharing && thumbnail) {
                                            return (
                                                <div key={p.identity} className="px-1 py-1.5 rounded-lg">
                                                    <div className="flex items-center gap-2 px-2 mb-1.5 min-w-0">
                                                        <div className="w-6 h-6 rounded-full bg-[#2A2D35] flex items-center justify-center text-[10px] font-medium overflow-hidden shrink-0">
                                                            {name[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="text-[13px] text-[#B4B6BB] truncate flex-1 min-w-0">
                                                            {name}
                                                        </span>
                                                        <LiveBadge />
                                                    </div>
                                                    <button
                                                        onClick={() => handleJoin(channelId)}
                                                        disabled={isJoining}
                                                        className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/8 group/thumb cursor-pointer disabled:opacity-60"
                                                        title={`Entrar na chamada e assistir a transmissão de ${name}`}
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={thumbnail.dataUrl} alt="" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                                            {isJoining ? (
                                                                <Loader2 size={16} className="text-white animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Eye size={16} className="text-white" />
                                                                    <span className="text-[12px] font-semibold text-white">Entrar</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </button>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={p.identity}
                                                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/3 min-w-0"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium shrink-0">
                                                    {isJoining ? <Loader2 size={14} className="animate-spin" /> : name[0]?.toUpperCase()}
                                                </div>
                                                <div className='w-full flex items-center justify-between group'>
                                                    <span className="text-[14px] text-[#EDEBE7] truncate">{name}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
