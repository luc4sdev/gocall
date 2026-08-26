import { Eye, Loader2, Radio, UserPlus } from 'lucide-react';
import { Participant } from 'livekit-client';
import type { ChannelDTO } from '@/lib/types';
import type { ScreenShareThumbnail } from './ScreenShareThumbnailBridge';

export type FriendRelationship = 'friend' | 'outgoing' | 'incoming';

interface MembersSidebarProps {
    participants: Participant[];
    localIdentity: string;
    channels: ChannelDTO[];
    thumbnails?: Map<string, ScreenShareThumbnail>;
    onWatchStream?: (channelId: string) => void;
    myVoiceChannelId?: string | null;
    relationshipByUserId?: Map<string, FriendRelationship>;
    onSendFriendRequest?: (username: string) => void;
    pendingFriendUsername?: string | null;
}

interface Member {
    identity: string;
    name: string;
    isLocal: boolean;
    inCall: boolean;
    voiceChannelId: string | null;
    screenSharing: boolean;
}

function LiveBadge() {
    return (
        <span className="flex items-center gap-1 shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#F2555A] bg-[#F2555A]/10 px-1.5 py-0.5 rounded">
            <Radio size={10} />
            Ao vivo
        </span>
    );
}

function AddFriendButton({ onClick, pending }: { onClick: () => void; pending: boolean }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            disabled={pending}
            title="Adicionar amigo"
            className="shrink-0 p-1.5 rounded-lg text-[#63656B] opacity-0 group-hover:opacity-100 hover:bg-brand/15 hover:text-brand transition-all disabled:opacity-40 cursor-pointer"
        >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
        </button>
    );
}

function MemberRow({
    member,
    thumbnail,
    onWatchStream,
    canAddFriend,
    onSendFriendRequest,
    sendingRequest,
}: {
    member: Member;
    thumbnail?: ScreenShareThumbnail;
    onWatchStream?: () => void;
    canAddFriend: boolean;
    onSendFriendRequest?: () => void;
    sendingRequest: boolean;
}) {
    if (member.screenSharing && !member.isLocal && thumbnail && onWatchStream) {
        return (
            <div className="group px-1 py-1.5 rounded-lg">
                <div className="flex items-center gap-2 px-2 mb-1.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-[#2A2D35] flex items-center justify-center text-[10px] font-medium overflow-hidden shrink-0">
                        {member.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-[13px] text-[#B4B6BB] truncate flex-1 min-w-0">
                        {member.name}
                    </span>
                    <LiveBadge />
                    {canAddFriend && onSendFriendRequest && (
                        <AddFriendButton onClick={onSendFriendRequest} pending={sendingRequest} />
                    )}
                </div>
                <button
                    onClick={onWatchStream}
                    className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/8 group/thumb cursor-pointer"
                    title={`Assistir a transmissão de ${member.name}`}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnail.dataUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <Eye size={16} className="text-white" />
                        <span className="text-[12px] font-semibold text-white">Assistir</span>
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div className="group flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/3 cursor-pointer min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                    <div
                        className='w-8 h-8 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium overflow-hidden transition-shadow'
                    >
                        {member.name[0]?.toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#16171A]" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[13px] text-[#B4B6BB] truncate">
                        {member.name}
                        {member.isLocal && ' (você)'}
                    </span>
                    {member.screenSharing && <LiveBadge />}
                </div>
            </div>
            {canAddFriend && onSendFriendRequest && (
                <AddFriendButton onClick={onSendFriendRequest} pending={sendingRequest} />
            )}
        </div>
    );
}

export function MembersSidebar({
    participants,
    localIdentity,
    channels,
    thumbnails,
    onWatchStream,
    myVoiceChannelId,
    relationshipByUserId,
    onSendFriendRequest,
    pendingFriendUsername,
}: MembersSidebarProps) {
    const members: Member[] = participants.map((p) => ({
        identity: p.identity,
        name: p.name || p.identity,
        isLocal: p.identity === localIdentity,
        inCall: p.attributes?.inCall === 'true',
        voiceChannelId: p.attributes?.voiceChannelId || null,
        screenSharing: p.attributes?.screenSharing === 'true',
    }));

    const canAddFriend = (m: Member) =>
        !m.isLocal &&
        m.name !== m.identity &&
        !relationshipByUserId?.has(m.identity) &&
        !!onSendFriendRequest;

    const inCallMembers = members.filter((m) => m.inCall);
    const onlineMembers = members.filter((m) => !m.inCall);

    const callGroups = new Map<string, Member[]>();
    for (const m of inCallMembers) {
        const key = m.voiceChannelId ?? '';
        const group = callGroups.get(key);
        if (group) group.push(m);
        else callGroups.set(key, [m]);
    }

    return (
        <div className="w-60 bg-[#16171A] flex flex-col shrink-0 border-l border-white/4">
            <div className="h-14 px-4 flex items-center shrink-0 border-b border-white/4">
                <span className="font-display font-semibold text-[13px] text-[#8B8D93] uppercase tracking-wider">
                    Membros — {members.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-4">
                {callGroups.size > 0 && (
                    <div className="mb-5">
                        <div className="mb-2 px-3 text-[11px] font-medium text-[#8B8D93] uppercase tracking-wider">
                            Em chamada — {inCallMembers.length}
                        </div>
                        {Array.from(callGroups.entries()).map(([channelId, groupMembers]) => {
                            const channelName = channels.find((c) => c.id === channelId)?.name ?? 'Chamada';
                            const isMyChannel = channelId === myVoiceChannelId;
                            return (
                                <div key={channelId || 'unknown'} className="mb-3 last:mb-0">
                                    <div className="mb-1 px-3 text-[11px] font-medium text-[#63656B]">
                                        {channelName}
                                    </div>
                                    {groupMembers.sort((a, b) => Number(b.screenSharing) - Number(a.screenSharing)).map((m) => (
                                        <MemberRow
                                            key={m.identity}
                                            member={m}
                                            thumbnail={isMyChannel ? undefined : thumbnails?.get(m.identity)}
                                            onWatchStream={!isMyChannel && onWatchStream && m.voiceChannelId ? () => onWatchStream(m.voiceChannelId!) : undefined}
                                            canAddFriend={canAddFriend(m)}
                                            onSendFriendRequest={onSendFriendRequest ? () => onSendFriendRequest(m.name) : undefined}
                                            sendingRequest={pendingFriendUsername === m.name}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}

                {onlineMembers.length > 0 && (
                    <>
                        <div className="mt-1 mb-2 px-3 text-[11px] font-medium text-[#8B8D93] uppercase tracking-wider">
                            Online — {onlineMembers.length}
                        </div>
                        {onlineMembers.map((m) => (
                            <MemberRow
                                key={m.identity}
                                member={m}
                                canAddFriend={canAddFriend(m)}
                                onSendFriendRequest={onSendFriendRequest ? () => onSendFriendRequest(m.name) : undefined}
                                sendingRequest={pendingFriendUsername === m.name}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
