import React, { useState } from 'react';
import { Hash, Volume2, VolumeX, Settings, Headphones, Mic, MicOff, HeadphoneOff, PhoneOff, ScreenShare, ArrowLeft, Users, X } from 'lucide-react';
import { Participant } from 'livekit-client';
import { useLocalParticipant } from '@livekit/components-react';
import { getAudioCaptureOptions, playDiscordSound } from '@/lib/utils';
import type { ChannelDTO } from '@/lib/types';
import { SettingsModal } from './SettingsModal';
import { MembersSidebar } from './MembersSidebar';
import { useParticipantAudio } from '@/components/call/ParticipantAudioContext';
import { ParticipantVolumePanel } from '@/components/call/ParticipantVolumePanel';

function LiveBadge() {
    return (
        <span className="flex items-center gap-1 shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#F2555A] bg-[#F2555A]/10 px-1.5 py-0.5 rounded">
            <ScreenShare size={10} />
            Ao vivo
        </span>
    );
}

interface DiscordLayoutProps {
    children: React.ReactNode;
    serverName: string;
    channels: ChannelDTO[];
    activeChannelId: string;
    onChannelSelect: (channelId: string) => void;
    isConnected: boolean;
    onLeaveCall: () => void;
    activeParticipants?: Participant[];
    username: string;
    hideMembersSidebar?: boolean;
}

export function Layout({ children, serverName, channels, activeChannelId, onChannelSelect, isConnected, onLeaveCall, activeParticipants = [], username, hideMembersSidebar = false }: DiscordLayoutProps) {
    const { isMicrophoneEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant();
    const { isDeafened, toggleDeafen: toggleDeafenState, isMuted } = useParticipantAudio();
    const [showSettings, setShowSettings] = useState(false);
    const [openVolumeIdentity, setOpenVolumeIdentity] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'sidebar' | 'content'>('sidebar');
    const [showMembersMobile, setShowMembersMobile] = useState(false);

    const handleChannelSelect = (channelId: string) => {
        onChannelSelect(channelId);
        setMobileView('content');
    };

    const callParticipants = activeParticipants.filter(
        (p) => p.identity !== localParticipant.identity && p.attributes?.inCall === 'true'
    );

    const textChannels = channels.filter((c) => c.type === 'TEXT');
    const voiceChannels = channels.filter((c) => c.type === 'VOICE');

    const handleLeaveCall = async () => {
        await localParticipant.setMicrophoneEnabled(false);
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setScreenShareEnabled(false);
        await localParticipant.setAttributes({ inCall: 'false' });
        playDiscordSound('leave');
        onLeaveCall();
    };

    const isInRoom = isConnected;

    const toggleMic = () => {
        if (!isInRoom) return;
        const next = !isMicrophoneEnabled;
        playDiscordSound(next ? 'unmute' : 'mute');
        localParticipant
            .setMicrophoneEnabled(next, next ? getAudioCaptureOptions() : undefined)
            .catch(console.error);
    };

    const toggleDeafen = () => {
        if (!isInRoom) return;
        const next = !isDeafened;
        toggleDeafenState();
        playDiscordSound(next ? 'deafen' : 'undeafen');
        if (next && isMicrophoneEnabled) {
            localParticipant.setMicrophoneEnabled(false).catch(console.error);
        }
    };

    const micMuted = isInRoom ? !isMicrophoneEnabled : false;

    return (
        <div className="flex h-screen bg-[#0F1012] text-[#EDEBE7] overflow-hidden font-sans antialiased">

            <div className="hidden lg:flex w-16 bg-[#0B0C0D] flex-col items-center py-4 gap-3 shrink-0 border-r border-white/4">
                <div className="relative group cursor-pointer">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#FF6B4A] rounded-full" />
                    <div className="w-11 h-11 rounded-2xl bg-[#1F2023] flex items-center justify-center transition-colors group-hover:bg-[#26282c]">
                        <span className="font-display font-semibold text-[#EDEBE7] text-[13px] tracking-wide">GO</span>
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
                    {textChannels.length > 0 && (
                        <div className="mb-2 px-3 text-[11px] font-medium text-[#8B8D93] uppercase tracking-wider">
                            Texto
                        </div>
                    )}
                    {textChannels.map((channel) => (
                        <button
                            key={channel.id}
                            onClick={() => handleChannelSelect(channel.id)}
                            className="w-full group relative flex items-center gap-2.5 pl-3 pr-2 py-1.5 mb-0.5 text-[14px] transition-colors rounded-lg"
                        >
                            {activeChannelId === channel.id && (
                                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#FF6B4A] rounded-full" />
                            )}
                            <Hash
                                size={17}
                                className={activeChannelId === channel.id ? 'text-[#FF6B4A]' : 'text-[#63656B] group-hover:text-[#8B8D93]'}
                            />
                            <span className={activeChannelId === channel.id ? 'text-[#EDEBE7]' : 'text-[#8B8D93] group-hover:text-[#EDEBE7]'}>
                                {channel.name}
                            </span>
                        </button>
                    ))}

                    {voiceChannels.length > 0 && (
                        <div className="mt-5 mb-2 px-3 text-[11px] font-medium text-[#8B8D93] uppercase tracking-wider">
                            Voz
                        </div>
                    )}
                    {voiceChannels.map((channel) => (
                        <button
                            key={channel.id}
                            onClick={() => handleChannelSelect(channel.id)}
                            className="w-full group relative flex items-center gap-2.5 pl-3 pr-2 py-1.5 text-[14px] transition-colors rounded-lg"
                        >
                            {activeChannelId === channel.id && (
                                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#FF6B4A] rounded-full" />
                            )}
                            <Volume2
                                size={17}
                                className={activeChannelId === channel.id ? 'text-[#FF6B4A]' : 'text-[#63656B] group-hover:text-[#8B8D93]'}
                            />
                            <span className={activeChannelId === channel.id ? 'text-[#EDEBE7]' : 'text-[#8B8D93] group-hover:text-[#EDEBE7]'}>
                                {channel.name}
                            </span>
                        </button>
                    ))}

                    {(isConnected || callParticipants.length > 0) && (
                        <div className="ml-3 mt-1 flex flex-col gap-0.5">
                            {isConnected && (
                                <div className="group flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="relative shrink-0">
                                            <div
                                                className={`w-7 h-7 rounded-full bg-[#2A2D35] flex items-center justify-center text-[11px] font-medium overflow-hidden transition-shadow ${localParticipant.isSpeaking ? 'ring-2 ring-[#4ADE80] ring-offset-2 ring-offset-[#16171A] animate-pulse' : ''
                                                    }`}
                                            >
                                                {(username || localParticipant.identity)?.[0]?.toUpperCase()}
                                            </div>
                                            {micMuted && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#16171A] rounded-full flex items-center justify-center">
                                                    <MicOff size={9} className="text-[#8B8D93]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-[13px] text-[#B4B6BB] truncate">
                                                {username || localParticipant.identity} (você)
                                            </span>
                                            {isScreenShareEnabled && <LiveBadge />}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLeaveCall}
                                        className="p-1.5 rounded-lg text-[#63656B] hover:bg-[#F2555A]/15 hover:text-[#F2555A] transition-all shrink-0"
                                        title="Sair da chamada"
                                    >
                                        <PhoneOff size={14} />
                                    </button>
                                </div>
                            )}
                            {callParticipants.map((p) => {
                                const isOpen = openVolumeIdentity === p.identity;
                                const muted = isMuted(p.identity);
                                return (
                                    <div key={p.identity}>
                                        <div
                                            onClick={() => setOpenVolumeIdentity((prev) => (prev === p.identity ? null : p.identity))}
                                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/3 cursor-pointer"
                                        >
                                            <div className="relative shrink-0">
                                                <div
                                                    className={`w-7 h-7 rounded-full bg-[#2A2D35] flex items-center justify-center text-[11px] font-medium overflow-hidden transition-shadow ${p.isSpeaking ? 'ring-2 ring-[#4ADE80] ring-offset-2 ring-offset-[#16171A] animate-pulse' : ''
                                                        }`}
                                                >
                                                    {p.name?.[0]?.toUpperCase() || p.identity?.[0]?.toUpperCase()}
                                                </div>
                                                {!p.isMicrophoneEnabled && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#16171A] rounded-full flex items-center justify-center">
                                                        <MicOff size={9} className="text-[#8B8D93]" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[13px] text-[#B4B6BB] truncate flex-1 min-w-0">
                                                {p.name || p.identity}
                                            </span>
                                            {p.isScreenShareEnabled && <LiveBadge />}
                                            {muted ? (
                                                <VolumeX size={14} className="text-[#F2555A] shrink-0" />
                                            ) : (
                                                <Volume2 size={14} className="text-[#63656B] shrink-0" />
                                            )}
                                        </div>
                                        {isOpen && (
                                            <div className="px-3 pb-2 pt-1">
                                                <ParticipantVolumePanel volumeKey={p.identity} name={p.name || p.identity} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="h-16 px-3 flex items-center justify-between shrink-0 border-t border-white/4">
                    <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/3 cursor-pointer flex-1 min-w-0">
                        <div className="relative w-8 h-8 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium shrink-0">
                            {(username || '?')[0]?.toUpperCase()}
                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-[#16171A]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-medium truncate">{username || 'Conectando...'}</span>
                            <span className="text-[11px] text-[#63656B] truncate">
                                {isInRoom ? 'Em chamada' : 'Online'}
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
                    <MembersSidebar participants={activeParticipants} localIdentity={localParticipant.identity} />
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
                        <MembersSidebar participants={activeParticipants} localIdentity={localParticipant.identity} />
                    </div>
                </div>
            )}

            <SettingsModal open={showSettings} onOpenChange={setShowSettings} username={username} />
        </div>
    );
}