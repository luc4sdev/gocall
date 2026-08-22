import React, { useState, useEffect, useCallback } from 'react';
import { Hash, Volume2, Settings, Headphones, Mic, MicOff, HeadphoneOff, PhoneOff } from 'lucide-react';
import { Participant, RemoteAudioTrack, RoomEvent, Track } from 'livekit-client';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { playDiscordSound } from '@/lib/utils';
import type { ChannelDTO } from '@/lib/types';
import { SettingsModal } from './SettingsModal';
import { MembersSidebar } from './MembersSidebar';

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
    const room = useRoomContext();
    const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
    const [isDeafened, setIsDeafened] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

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

    const applyDeafenState = useCallback((deafened: boolean) => {
        room.remoteParticipants.forEach((participant) => {
            participant.audioTrackPublications.forEach((pub) => {
                if (pub.audioTrack instanceof RemoteAudioTrack) {
                    pub.audioTrack.setVolume(deafened ? 0 : 1);
                }
            });
        });
    }, [room]);

    useEffect(() => {
        if (!isInRoom) return;
        const handleSubscribed = (track: Track) => {
            if (track instanceof RemoteAudioTrack && isDeafened) {
                track.setVolume(0);
            }
        };
        room.on(RoomEvent.TrackSubscribed, handleSubscribed);
        return () => {
            room.off(RoomEvent.TrackSubscribed, handleSubscribed);
        };
    }, [room, isInRoom, isDeafened]);

    const toggleMic = () => {
        if (!isInRoom) return;
        const next = !isMicrophoneEnabled;
        playDiscordSound(next ? 'unmute' : 'mute');
        localParticipant.setMicrophoneEnabled(next).catch(console.error);
    };

    const toggleDeafen = () => {
        if (!isInRoom) return;
        const next = !isDeafened;
        setIsDeafened(next);
        applyDeafenState(next);
        playDiscordSound(next ? 'deafen' : 'undeafen');
        if (next && isMicrophoneEnabled) {
            localParticipant.setMicrophoneEnabled(false).catch(console.error);
        }
    };

    const micMuted = isInRoom ? !isMicrophoneEnabled : false;

    return (
        <div className="flex h-screen bg-[#0F1012] text-[#EDEBE7] overflow-hidden font-sans antialiased">

            <div className="w-16 bg-[#0B0C0D] flex flex-col items-center py-4 gap-3 shrink-0 border-r border-white/4">
                <div className="relative group cursor-pointer">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#FF6B4A] rounded-full" />
                    <div className="w-11 h-11 rounded-2xl bg-[#1F2023] flex items-center justify-center transition-colors group-hover:bg-[#26282c]">
                        <span className="font-display font-semibold text-[#EDEBE7] text-[13px] tracking-wide">GO</span>
                    </div>
                </div>
            </div>

            <div className="w-64 bg-[#16171A] flex flex-col shrink-0">
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
                            onClick={() => onChannelSelect(channel.id)}
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
                            onClick={() => onChannelSelect(channel.id)}
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
                                        <span className="text-[13px] text-[#B4B6BB] truncate">
                                            {username || localParticipant.identity} (você)
                                        </span>
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
                            {callParticipants.map((p) => (
                                <div key={p.identity} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/3 cursor-pointer">
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
                                    <span className="text-[13px] text-[#B4B6BB] truncate">
                                        {p.name || p.identity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="h-16 px-3 flex items-center justify-between shrink-0 border-t border-white/4">
                    <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/3 cursor-pointer flex-1 min-w-0">
                        <div className="relative w-8 h-8 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium overflow-hidden shrink-0">
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

            <div className="flex-1 flex flex-col min-w-0 bg-[#0F1012]">
                {children}
            </div>

            {!hideMembersSidebar && (
                <MembersSidebar participants={activeParticipants} localIdentity={localParticipant.identity} />
            )}

            <SettingsModal open={showSettings} onOpenChange={setShowSettings} username={username} />
        </div>
    );
}