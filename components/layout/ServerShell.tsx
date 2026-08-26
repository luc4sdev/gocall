'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Hash, Volume2, MicOff, PhoneOff, ArrowLeft, Users, X, Radio, Plus, Trash2 } from 'lucide-react';
import type { Participant } from 'livekit-client';
import type { ChannelDTO } from '@/lib/types';
import { useAppContext } from '@/components/AppContext';
import { UserControlBar } from './UserControlBar';
import { MembersSidebar, type FriendRelationship } from './MembersSidebar';
import { CreateChannelDialog } from './CreateChannelDialog';
import { DeleteChannelDialog } from './DeleteChannelDialog';
import { ChannelSyncBridge, type ChannelSyncMessage } from './ChannelSyncBridge';
import { useFriendsData } from '@/components/friends/useFriendsData';

function LiveBadge() {
    return (
        <span className="flex items-center gap-1 shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#F2555A] bg-[#F2555A]/10 px-1.5 py-0.5 rounded">
            <Radio size={10} />
            Ao vivo
        </span>
    );
}

function formatCallDuration(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

function CallTimer({ startedAt }: { startedAt: number }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <span className="shrink-0 leading-none text-[11px] font-medium text-brand tabular-nums">
            {formatCallDuration(now - startedAt)}
        </span>
    );
}

interface ServerShellProps {
    children: React.ReactNode;
    serverId: string;
    serverName: string;
    initialChannels: ChannelDTO[];
}

export function ServerShell({ children, serverId, serverName, initialChannels }: ServerShellProps) {
    const router = useRouter();
    const params = useParams<{ serverId: string; channelId?: string }>();
    const activeChannelId = params?.channelId ?? '';

    const {
        username,
        localIdentity,
        activeParticipants,
        voiceChannel,
        voiceState,
        theaterMode,
        onJoinVoice,
        onLeaveVoice,
        screenShareThumbnails,
        setSkipAutoPauseOnJoin,
        registerVoiceParticipantsSlot,
    } = useAppContext();

    const isViewingOwnCall = !!voiceChannel && voiceChannel.id === activeChannelId;
    const hideMembersSidebar = isViewingOwnCall && theaterMode;

    const [channels, setChannels] = useState<ChannelDTO[]>(initialChannels);
    const channelsRef = useRef(channels);
    useEffect(() => {
        channelsRef.current = channels;
    }, [channels]);
    const [mobileView, setMobileView] = useState<'sidebar' | 'content'>('sidebar');
    const [showMembersMobile, setShowMembersMobile] = useState(false);
    const [createChannelType, setCreateChannelType] = useState<'TEXT' | 'VOICE' | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ChannelDTO | null>(null);
    const broadcastRef = useRef<((message: ChannelSyncMessage) => void) | null>(null);

    const { data: friendsData, refresh: refreshFriends } = useFriendsData();
    const [pendingFriendUsername, setPendingFriendUsername] = useState<string | null>(null);

    const relationshipByUserId = useMemo(() => {
        const map = new Map<string, FriendRelationship>();
        for (const f of friendsData?.friends ?? []) map.set(f.id, 'friend');
        for (const r of friendsData?.outgoingRequests ?? []) map.set(r.id, 'outgoing');
        for (const r of friendsData?.incomingRequests ?? []) map.set(r.id, 'incoming');
        return map;
    }, [friendsData]);

    const handleSendFriendRequest = useCallback(
        async (username: string) => {
            setPendingFriendUsername(username);
            try {
                const res = await fetch('/api/friends', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username }),
                });
                if (res.ok) await refreshFriends();
            } finally {
                setPendingFriendUsername(null);
            }
        },
        [refreshFriends]
    );

    const applyChannelCreated = useCallback((channel: ChannelDTO) => {
        setChannels((prev) => (prev.some((c) => c.id === channel.id) ? prev : [...prev, channel]));
    }, []);

    const applyChannelDeleted = useCallback(
        (channelId: string) => {
            setChannels((prev) => prev.filter((c) => c.id !== channelId));

            if (activeChannelId === channelId) {
                const remaining = channelsRef.current.filter((c) => c.id !== channelId);
                const fallback = remaining.find((c) => c.type === 'TEXT') ?? remaining[0];
                router.push(fallback ? `/servers/${serverId}/channels/${fallback.id}` : `/servers/${serverId}`);
            }
            if (voiceChannel?.id === channelId) {
                onLeaveVoice();
            }
        },
        [activeChannelId, router, serverId, voiceChannel, onLeaveVoice]
    );

    const handleChannelCreated = useCallback(
        (channel: ChannelDTO) => {
            applyChannelCreated(channel);
            broadcastRef.current?.({ type: 'created', channel });
        },
        [applyChannelCreated]
    );

    const handleChannelDeleted = useCallback(
        (channelId: string) => {
            applyChannelDeleted(channelId);
            broadcastRef.current?.({ type: 'deleted', channelId });
        },
        [applyChannelDeleted]
    );

    const handleChannelSyncMessage = useCallback(
        (message: ChannelSyncMessage) => {
            if (message.type === 'created') {
                applyChannelCreated({ ...message.channel, canDelete: false });
            } else {
                applyChannelDeleted(message.channelId);
            }
        },
        [applyChannelCreated, applyChannelDeleted]
    );

    const handleBroadcastReady = useCallback((broadcast: (message: ChannelSyncMessage) => void) => {
        broadcastRef.current = broadcast;
    }, []);

    const handleChannelSelect = () => {
        setMobileView('content');
    };

    const handleWatchStream = useCallback(
        (channelId: string) => {
            const channel = channels.find((c) => c.id === channelId);
            if (!channel) return;
            router.push(`/servers/${serverId}/channels/${channelId}`);
            setSkipAutoPauseOnJoin(true);
            setShowMembersMobile(false);
            setMobileView('content');
            onJoinVoice(channel);
        },
        [channels, router, serverId, onJoinVoice, setSkipAutoPauseOnJoin]
    );

    const textChannels = useMemo(() => channels.filter((c) => c.type === 'TEXT'), [channels]);
    const voiceChannels = useMemo(() => channels.filter((c) => c.type === 'VOICE'), [channels]);

    const callParticipantsByChannel = new Map<string, Participant[]>();
    const callStartedAtByChannel = new Map<string, number>();
    for (const p of activeParticipants) {
        if (p.attributes?.inCall !== 'true') continue;
        const cid = p.attributes?.voiceChannelId;
        if (!cid) continue;

        if (!callStartedAtByChannel.has(cid) && p.attributes?.voiceChannelStartedAt) {
            callStartedAtByChannel.set(cid, Number(p.attributes.voiceChannelStartedAt));
        }

        if (p.identity === localIdentity) continue;
        const group = callParticipantsByChannel.get(cid);
        if (group) group.push(p);
        else callParticipantsByChannel.set(cid, [p]);
    }

    const isInRoom = voiceState !== null;
    const micMuted = isInRoom ? !voiceState.isMicrophoneEnabled : false;

    return (
        <>
            <ChannelSyncBridge onMessage={handleChannelSyncMessage} onReady={handleBroadcastReady} />

            <div
                className={`w-full lg:w-64 bg-[#16171A] flex-col shrink-0 ${mobileView === 'sidebar' ? 'flex' : 'hidden'} lg:flex`}
            >
                <div className="h-14 px-4 flex items-center shrink-0 border-b border-white/4">
                    <span className="font-display font-semibold text-[15px] tracking-tight truncate">{serverName}</span>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-4">
                    <div className="flex items-center justify-between pl-3 pr-1">
                        <span className="text-[11px] font-medium text-[#8B8D93] uppercase tracking-wider">
                            Texto
                        </span>
                        <button
                            onClick={() => setCreateChannelType('TEXT')}
                            className="p-1 rounded text-[#63656B] hover:bg-white/5 hover:text-[#EDEBE7] transition-colors"
                            title="Criar canal de texto"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    {textChannels.map((channel) => (
                        <div key={channel.id} className="w-full group relative flex items-center rounded-lg mb-0.5">
                            {activeChannelId === channel.id && (
                                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand rounded-full" />
                            )}
                            <Link
                                href={`/servers/${serverId}/channels/${channel.id}`}
                                onClick={handleChannelSelect}
                                className="flex-1 min-w-0 flex items-center gap-2.5 pl-3 pr-2 py-1.5 text-[14px] transition-colors rounded-lg"
                            >
                                <Hash
                                    size={17}
                                    className={`shrink-0 ${activeChannelId === channel.id ? 'text-brand' : 'text-[#63656B] group-hover:text-[#8B8D93]'}`}
                                />
                                <span className={`truncate ${activeChannelId === channel.id ? 'text-[#EDEBE7]' : 'text-[#8B8D93] group-hover:text-[#EDEBE7]'}`}>
                                    {channel.name}
                                </span>
                            </Link>
                            {channel.canDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(channel); }}
                                    className="shrink-0 mr-1 p-1.5 rounded text-[#63656B] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-[#F2555A]/15 hover:text-[#F2555A] transition-all"
                                    title="Apagar canal"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </div>
                    ))}

                    <div className="flex items-center justify-between pl-3 pr-1 mt-5">
                        <span className="text-[11px] font-medium text-[#8B8D93] uppercase tracking-wider">
                            Voz
                        </span>
                        <button
                            onClick={() => setCreateChannelType('VOICE')}
                            className="p-1 rounded text-[#63656B] hover:bg-white/5 hover:text-[#EDEBE7] transition-colors"
                            title="Criar canal de voz"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    {voiceChannels.map((channel) => {
                        const isMyChannel = voiceChannel?.id === channel.id;
                        const otherMembers = [...(callParticipantsByChannel.get(channel.id) ?? [])].sort(
                            (a, b) => Number(b.attributes?.screenSharing === 'true') - Number(a.attributes?.screenSharing === 'true')
                        );
                        const showCallSection = (isMyChannel && isInRoom) || otherMembers.length > 0;
                        const callStartedAt = callStartedAtByChannel.get(channel.id);

                        return (
                            <div key={channel.id} className="mb-0.5">
                                <div className="w-full group relative flex items-center rounded-lg">
                                    {activeChannelId === channel.id && (
                                        <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand rounded-full" />
                                    )}
                                    <Link
                                        href={`/servers/${serverId}/channels/${channel.id}`}
                                        onClick={handleChannelSelect}
                                        className="flex-1 min-w-0 flex items-center gap-2.5 pl-3 pr-2 py-1.5 text-[14px] transition-colors rounded-lg"
                                    >
                                        <Volume2
                                            size={17}
                                            className={`shrink-0 ${activeChannelId === channel.id ? 'text-brand' : 'text-[#63656B] group-hover:text-[#8B8D93]'}`}
                                        />
                                        <span className="flex min-w-0 flex-1 items-baseline gap-2">
                                            <span className={`truncate ${activeChannelId === channel.id ? 'text-[#EDEBE7]' : 'text-[#8B8D93] group-hover:text-[#EDEBE7]'}`}>
                                                {channel.name}
                                            </span>
                                            {showCallSection && callStartedAt && <CallTimer startedAt={callStartedAt} />}
                                        </span>
                                    </Link>
                                    {channel.canDelete && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(channel); }}
                                            className="shrink-0 mr-1 p-1.5 rounded text-[#63656B] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-[#F2555A]/15 hover:text-[#F2555A] transition-all"
                                            title="Apagar canal"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>

                                {showCallSection && (
                                    <div className="ml-3 mt-0.5 flex flex-col gap-0.5">
                                        {isMyChannel && isInRoom && (
                                            <div className="group flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="relative shrink-0">
                                                        <div
                                                            className={`w-7 h-7 rounded-full bg-[#2A2D35] flex items-center justify-center text-[11px] font-medium overflow-hidden transition-shadow ${voiceState?.isSpeaking ? 'ring-2 ring-brand ring-offset-2 ring-offset-[#16171A] animate-pulse' : ''
                                                                }`}
                                                        >
                                                            {(username || localIdentity)?.[0]?.toUpperCase()}
                                                        </div>
                                                        {micMuted && (
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#16171A] rounded-full flex items-center justify-center">
                                                                <MicOff size={9} className="text-red-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="text-[13px] text-[#B4B6BB] truncate">
                                                            {username || localIdentity} (você)
                                                        </span>
                                                        {voiceState?.isScreenShareEnabled && <LiveBadge />}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={onLeaveVoice}
                                                    className="p-1.5 rounded-lg text-[#63656B] hover:bg-[#F2555A]/15 hover:text-[#F2555A] transition-all shrink-0"
                                                    title="Sair da chamada"
                                                >
                                                    <PhoneOff size={14} />
                                                </button>
                                            </div>
                                        )}
                                        {isMyChannel && isInRoom ? (
                                            <div ref={registerVoiceParticipantsSlot} />
                                        ) : (
                                            otherMembers.map((p) => (
                                                <div key={p.identity} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg min-w-0">
                                                    <div className="w-7 h-7 rounded-full bg-[#2A2D35] flex items-center justify-center text-[11px] font-medium overflow-hidden shrink-0">
                                                        {p.name?.[0]?.toUpperCase() || p.identity?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="text-[13px] text-[#B4B6BB] truncate">
                                                            {p.name || p.identity}
                                                        </span>
                                                        {p.attributes?.screenSharing === 'true' && <LiveBadge />}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <UserControlBar />
            </div>

            <div
                className={`w-full lg:w-auto flex-1 flex-col min-w-0 min-h-0 bg-[#0F1012] ${mobileView === 'content' ? 'flex' : 'hidden'} lg:flex`}
            >
                <div className="lg:hidden h-12 px-2 flex items-center justify-between gap-2 border-b border-white/4 shrink-0">
                    <button
                        onClick={() => setMobileView('sidebar')}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[#8B8D93] hover:bg-white/5 hover:text-[#EDEBE7] transition-colors text-[13px]"
                    >
                        <ArrowLeft size={16} />
                        Canais
                    </button>
                    <button
                        onClick={() => setShowMembersMobile(true)}
                        className="p-2 rounded-lg text-[#8B8D93] hover:bg-white/5 hover:text-[#EDEBE7] transition-colors"
                        title="Membros"
                    >
                        <Users size={17} />
                    </button>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                    {children}
                </div>
            </div>

            {!hideMembersSidebar && (
                <div className="hidden lg:flex">
                    <MembersSidebar
                        participants={activeParticipants}
                        localIdentity={localIdentity}
                        channels={channels}
                        thumbnails={screenShareThumbnails}
                        onWatchStream={handleWatchStream}
                        myVoiceChannelId={isInRoom ? (voiceChannel?.id ?? null) : null}
                        relationshipByUserId={relationshipByUserId}
                        onSendFriendRequest={handleSendFriendRequest}
                        pendingFriendUsername={pendingFriendUsername}
                    />
                </div>
            )}

            {!hideMembersSidebar && showMembersMobile && (
                <div
                    className="lg:hidden fixed inset-0 z-40 flex justify-end bg-black/50"
                    onClick={() => setShowMembersMobile(false)}
                >
                    <div className="relative flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowMembersMobile(false)}
                            className="absolute top-3 -left-11 p-2 rounded-lg bg-[#16171A] text-[#8B8D93] hover:text-[#EDEBE7] transition-colors"
                            title="Fechar"
                        >
                            <X size={18} />
                        </button>
                        <MembersSidebar
                            participants={activeParticipants}
                            localIdentity={localIdentity}
                            channels={channels}
                            thumbnails={screenShareThumbnails}
                            onWatchStream={handleWatchStream}
                            myVoiceChannelId={isInRoom ? (voiceChannel?.id ?? null) : null}
                            relationshipByUserId={relationshipByUserId}
                            onSendFriendRequest={handleSendFriendRequest}
                            pendingFriendUsername={pendingFriendUsername}
                        />
                    </div>
                </div>
            )}

            <CreateChannelDialog
                open={createChannelType !== null}
                onOpenChange={(open) => !open && setCreateChannelType(null)}
                type={createChannelType ?? 'TEXT'}
                serverId={serverId}
                onCreated={handleChannelCreated}
            />

            <DeleteChannelDialog
                channel={deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onDeleted={handleChannelDeleted}
            />
        </>
    );
}
