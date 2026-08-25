import React, { useEffect, useState } from 'react';
import { Hash, Volume2, Settings, Headphones, Mic, MicOff, HeadphoneOff, PhoneOff, ArrowLeft, Users, X, Radio, Plus, Trash2 } from 'lucide-react';
import { Participant } from 'livekit-client';
import type { ChannelDTO } from '@/lib/types';
import { SettingsModal } from './SettingsModal';
import { MembersSidebar } from './MembersSidebar';
import type { ScreenShareThumbnail } from './ScreenShareThumbnailBridge';
import { CreateChannelDialog } from './CreateChannelDialog';
import { DeleteChannelDialog } from './DeleteChannelDialog';
import { Logo } from '@/components/Logo';
import type { VoiceControlState } from '@/components/call/VoiceRoomBridge';

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

interface DiscordLayoutProps {
    children: React.ReactNode;
    serverName: string;
    serverId: string;
    channels: ChannelDTO[];
    activeChannelId: string;
    onChannelSelect: (channelId: string) => void;
    onChannelCreated: (channel: ChannelDTO) => void;
    onChannelDeleted: (channelId: string) => void;
    localIdentity: string;
    username: string;
    voiceChannelId: string | null;
    voiceState: VoiceControlState | null;
    onLeaveCall: () => void;
    activeParticipants?: Participant[];
    hideMembersSidebar?: boolean;
    voiceParticipantsSlotRef?: (el: HTMLDivElement | null) => void;
    screenShareThumbnails?: Map<string, ScreenShareThumbnail>;
    onWatchStream?: (channelId: string) => void;
}

export function Layout({
    children,
    serverName,
    serverId,
    channels,
    activeChannelId,
    onChannelSelect,
    onChannelCreated,
    onChannelDeleted,
    localIdentity,
    username,
    voiceChannelId,
    voiceState,
    onLeaveCall,
    activeParticipants = [],
    hideMembersSidebar = false,
    voiceParticipantsSlotRef,
    screenShareThumbnails,
    onWatchStream,
}: DiscordLayoutProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [mobileView, setMobileView] = useState<'sidebar' | 'content'>('sidebar');
    const [showMembersMobile, setShowMembersMobile] = useState(false);
    const [createChannelType, setCreateChannelType] = useState<'TEXT' | 'VOICE' | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ChannelDTO | null>(null);

    const handleChannelSelect = (channelId: string) => {
        onChannelSelect(channelId);
        setMobileView('content');
    };

    const textChannels = channels.filter((c) => c.type === 'TEXT');
    const voiceChannels = channels.filter((c) => c.type === 'VOICE');
    const voiceChannelName = channels.find((c) => c.id === voiceChannelId)?.name ?? '';

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
    const isDeafened = voiceState?.isDeafened ?? false;

    const toggleMic = () => voiceState?.toggleMic();
    const toggleDeafen = () => voiceState?.toggleDeafen();

    return (
        <div className="flex h-dvh bg-[#0F1012] text-[#EDEBE7] overflow-hidden font-sans antialiased">

            <div className="hidden lg:flex w-16 bg-[#0B0C0D] flex-col items-center py-4 gap-3 shrink-0 border-r border-white/4">
                <div className="relative group cursor-pointer">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand rounded-full" />
                    <div className="w-11 h-11 rounded-2xl bg-[#1F2023] flex items-center justify-center transition-colors group-hover:bg-[#26282c]">
                        <Logo className="w-6 h-6" />
                    </div>
                </div>
            </div>

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
                            <button
                                onClick={() => handleChannelSelect(channel.id)}
                                className="flex-1 min-w-0 flex items-center gap-2.5 pl-3 pr-2 py-1.5 text-[14px] transition-colors rounded-lg"
                            >
                                <Hash
                                    size={17}
                                    className={`shrink-0 ${activeChannelId === channel.id ? 'text-brand' : 'text-[#63656B] group-hover:text-[#8B8D93]'}`}
                                />
                                <span className={`truncate ${activeChannelId === channel.id ? 'text-[#EDEBE7]' : 'text-[#8B8D93] group-hover:text-[#EDEBE7]'}`}>
                                    {channel.name}
                                </span>
                            </button>
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
                        const isMyChannel = voiceChannelId === channel.id;
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
                                    <button
                                        onClick={() => handleChannelSelect(channel.id)}
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
                                    </button>
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
                                                    onClick={onLeaveCall}
                                                    className="p-1.5 rounded-lg text-[#63656B] hover:bg-[#F2555A]/15 hover:text-[#F2555A] transition-all shrink-0"
                                                    title="Sair da chamada"
                                                >
                                                    <PhoneOff size={14} />
                                                </button>
                                            </div>
                                        )}
                                        {isMyChannel && isInRoom ? (

                                            <div ref={voiceParticipantsSlotRef} />
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

                <div className="min-h-16 px-3 pb-[env(safe-area-inset-bottom)] flex items-center justify-between shrink-0 border-t border-white/4">
                    <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/3 cursor-pointer flex-1 min-w-0">
                        <div className="relative w-8 h-8 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium shrink-0">
                            {(username || '?')[0]?.toUpperCase()}
                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-[#16171A]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-medium truncate">{username || 'Conectando...'}</span>
                            <span className="text-[11px] text-[#63656B] truncate">
                                {isInRoom ? `Em chamada — ${voiceChannelName}` : 'Online'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={toggleMic}
                            disabled={!isInRoom}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${micMuted ? 'text-[#F2555A] bg-[#F2555A]/10 hover:bg-[#F2555A]/15' : 'text-[#8B8D93] hover:bg-white/5 hover:text-[#EDEBE7]'
                                }`}
                            title={micMuted ? 'Desmutar' : 'Mutar'}
                        >
                            {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>

                        <button
                            onClick={toggleDeafen}
                            disabled={!isInRoom}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDeafened ? 'text-[#F2555A] bg-[#F2555A]/10 hover:bg-[#F2555A]/15' : 'text-[#8B8D93] hover:bg-white/5 hover:text-[#EDEBE7]'
                                }`}
                            title={isDeafened ? 'Desensurdecer' : 'Ensurdecer'}
                        >
                            {isDeafened ? <HeadphoneOff size={16} /> : <Headphones size={16} />}
                        </button>

                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2 rounded-lg text-[#8B8D93] hover:bg-white/5 hover:text-[#EDEBE7] transition-colors"
                            title="Configurações"
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                </div>
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
                    {!hideMembersSidebar && (
                        <button
                            onClick={() => setShowMembersMobile(true)}
                            className="p-2 rounded-lg text-[#8B8D93] hover:bg-white/5 hover:text-[#EDEBE7] transition-colors"
                            title="Membros"
                        >
                            <Users size={17} />
                        </button>
                    )}
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
                        onWatchStream={onWatchStream}
                    />
                </div>
            )}

            {showMembersMobile && !hideMembersSidebar && (
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
                            onWatchStream={onWatchStream}
                        />
                    </div>
                </div>
            )}

            <SettingsModal open={showSettings} onOpenChange={setShowSettings} username={username} />

            <CreateChannelDialog
                open={createChannelType !== null}
                onOpenChange={(open) => !open && setCreateChannelType(null)}
                type={createChannelType ?? 'TEXT'}
                serverId={serverId}
                onCreated={onChannelCreated}
            />

            <DeleteChannelDialog
                channel={deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onDeleted={onChannelDeleted}
            />
        </div>
    );
}
