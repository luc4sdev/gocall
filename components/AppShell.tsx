'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';
import { Participant, type RoomOptions } from 'livekit-client';
import { LiveKitRoom, RoomAudioRenderer, StartAudio, useLocalParticipant, useParticipants } from '@livekit/components-react';
import { Logo } from '@/components/Logo';
import { VoiceRoom } from '@/components/call/VoiceRoom';
import { VoiceParticipantsList } from '@/components/call/VoiceParticipantsList';
import { ParticipantAudioProvider } from '@/components/call/ParticipantAudioContext';
import { CallPresenceSounds } from '@/components/call/CallPresenceSounds';
import { LobbyPresence } from '@/components/call/LobbyPresence';
import { VoiceRoomBridge, type VoiceControlState } from '@/components/call/VoiceRoomBridge';
import { RoomReconnectBridge } from '@/components/layout/RoomReconnectBridge';
import { ScreenShareThumbnailBridge, type ScreenShareThumbnail } from '@/components/layout/ScreenShareThumbnailBridge';
import { AppContext, type AppContextValue, type ScreenShareViewState } from '@/components/AppContext';
import { cn } from '@/lib/utils';
import type { ChannelDTO } from '@/lib/types';

const ROOM_OPTIONS: RoomOptions = { dynacast: true };

const EMPTY_SCREEN_SHARE_VIEW_STATE: ScreenShareViewState = {
    pausedKeys: new Set(),
    seenKeys: new Set(),
    focusedKey: null,
};

function ParticipantsSpy({ onChange }: { onChange: (p: Participant[]) => void }) {
    const participants = useParticipants();
    useEffect(() => { onChange(participants); }, [participants, onChange]);
    return null;
}

function LobbyIdentityReporter({ onIdentity }: { onIdentity: (id: string) => void }) {
    const { localParticipant } = useLocalParticipant();
    useEffect(() => { onIdentity(localParticipant.identity); }, [localParticipant.identity, onIdentity]);
    return null;
}

interface AppShellProps {
    username: string;
    homeServerId: string;
    homeServerName: string;
    children: React.ReactNode;
}

export function AppShell({ username, homeServerId, homeServerName, children }: AppShellProps) {
    const pathname = usePathname();
    const [lobbyToken, setLobbyToken] = useState<string>('');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [localIdentity, setLocalIdentity] = useState<string>('');
    const [error, setError] = useState<string>('');

    const [voiceChannel, setVoiceChannel] = useState<ChannelDTO | null>(null);
    const [voiceToken, setVoiceToken] = useState<string | null>(null);
    const [voiceState, setVoiceState] = useState<VoiceControlState | null>(null);
    const [theaterMode, setTheaterMode] = useState(false);
    const [localThumbnail, setLocalThumbnail] = useState<string | null>(null);
    const [screenShareThumbnails, setScreenShareThumbnails] = useState<Map<string, ScreenShareThumbnail>>(new Map());
    const [screenShareViewState, setScreenShareViewState] = useState<ScreenShareViewState>(EMPTY_SCREEN_SHARE_VIEW_STATE);
    const [skipAutoPauseOnJoin, setSkipAutoPauseOnJoin] = useState(false);
    const voiceTokenCacheRef = useRef<Map<string, string>>(new Map());
    const voiceChannelRef = useRef<ChannelDTO | null>(null);
    useEffect(() => {
        voiceChannelRef.current = voiceChannel;
    }, [voiceChannel]);

    const [voiceRoomSlot, setVoiceRoomSlot] = useState<{ channelId: string; el: HTMLDivElement } | null>(null);
    const [voiceRoomFallback, setVoiceRoomFallback] = useState<HTMLDivElement | null>(null);
    const [voiceParticipantsSlot, setVoiceParticipantsSlot] = useState<HTMLDivElement | null>(null);

    const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

    const handleLeaveVoice = useCallback(() => {
        setVoiceChannel(null);
        setVoiceToken(null);
        setVoiceState(null);
        setTheaterMode(false);
        setLocalThumbnail(null);
        setSkipAutoPauseOnJoin(false);
        setScreenShareViewState(EMPTY_SCREEN_SHARE_VIEW_STATE);
    }, []);

    const handleJoinVoice = useCallback(async (channel: ChannelDTO): Promise<boolean> => {
        if (!channel.roomName) return false;

        const cachedToken = voiceTokenCacheRef.current.get(channel.id);
        if (cachedToken) {
            setVoiceChannel(channel);
            setVoiceToken(cachedToken);
            return true;
        }

        try {
            const res = await fetch(`/api/livekit?room=${encodeURIComponent(channel.roomName)}`);
            const data = await res.json();
            if (!data.token) {
                console.error('Erro ao buscar token da call:', data.error);
                return false;
            }
            voiceTokenCacheRef.current.set(channel.id, data.token);
            setVoiceChannel(channel);
            setVoiceToken(data.token);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }, []);

    const refreshLobbyConnection = useCallback(() => {
        const lobbyRoomName = `lobby-${homeServerId}`;
        fetch(`/api/livekit?room=${encodeURIComponent(lobbyRoomName)}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.token) setLobbyToken(data.token);
            })
            .catch((err) => console.error('Falha ao reconectar ao lobby:', err));
    }, [homeServerId]);

    const handleVoiceDisconnected = useCallback(() => {
        const channel = voiceChannelRef.current;
        if (!channel?.roomName) return;
        fetch(`/api/livekit?room=${encodeURIComponent(channel.roomName)}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.token && voiceChannelRef.current?.id === channel.id) {
                    voiceTokenCacheRef.current.set(channel.id, data.token);
                    setVoiceToken(data.token);
                }
            })
            .catch((err) => console.error('Falha ao reconectar à chamada de voz:', err));
    }, []);

    useEffect(() => {
        let hiddenAt: number | null = null;
        const HIDDEN_THRESHOLD_MS = 60_000;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAt = Date.now();
                return;
            }
            if (hiddenAt !== null && Date.now() - hiddenAt > HIDDEN_THRESHOLD_MS) {
                refreshLobbyConnection();
            }
            hiddenAt = null;
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [refreshLobbyConnection]);

    const handleReceiveThumbnail = useCallback((thumbnail: ScreenShareThumbnail) => {
        setScreenShareThumbnails((prev) => new Map(prev).set(thumbnail.identity, thumbnail));
    }, []);

    const [prunedIdentitiesKey, setPrunedIdentitiesKey] = useState<string | null>(null);
    const activeIdentitiesKey = participants.map((p) => p.identity).sort().join(',');
    if (prunedIdentitiesKey !== activeIdentitiesKey) {
        setPrunedIdentitiesKey(activeIdentitiesKey);
        const activeIdentities = new Set(participants.map((p) => p.identity));
        setScreenShareThumbnails((prev) => {
            let changed = false;
            const next = new Map(prev);
            for (const identity of next.keys()) {
                if (!activeIdentities.has(identity)) {
                    next.delete(identity);
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }

    const registerVoiceRoomSlot = useCallback((channelId: string, el: HTMLDivElement | null) => {
        setVoiceRoomSlot((prev) => {
            if (el) return { channelId, el };
            if (prev?.channelId === channelId) return null;
            return prev;
        });
    }, []);

    const [connectAttempt, setConnectAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const init = async () => {
            try {
                const lobbyRoomName = `lobby-${homeServerId}`;
                const res = await fetch(`/api/livekit?room=${encodeURIComponent(lobbyRoomName)}`, {
                    signal: controller.signal,
                });
                const data = await res.json();
                if (cancelled) return;
                if (data.token) {
                    setLobbyToken(data.token);
                    return;
                }
                throw new Error(data.error || 'Erro ao buscar token');
            } catch (err) {
                if (cancelled) return;
                console.error(err);
                if (connectAttempt < 1) {
                    setTimeout(() => {
                        if (!cancelled) setConnectAttempt((n) => n + 1);
                    }, 2000);
                } else {
                    setError('Falha na conexão com o servidor.');
                }
            }
        };
        init();

        return () => {
            cancelled = true;
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [homeServerId, connectAttempt]);

    const handleRetryConnect = useCallback(() => {
        setError('');
        setLobbyToken('');
        setConnectAttempt((n) => n + 1);
    }, []);

    if (error) {
        return (
            <div className="flex h-dvh bg-[#16171A] items-center justify-center flex-col text-gray-300 text-center px-4">
                <p className="text-[#F2555A] font-semibold mb-2">Não foi possível conectar</p>
                <p className="text-sm text-[#8B8D93] mb-4">{error}</p>
                <button
                    onClick={handleRetryConnect}
                    className="text-sm font-semibold bg-brand hover:bg-brand-hover text-[#0F1012] rounded-lg px-4 py-2 transition-colors cursor-pointer"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (!lobbyToken) {
        return (
            <div className="flex h-dvh bg-[#16171A] items-center justify-center flex-col text-gray-300">
                <Logo className="w-10 h-10 animate-pulse mb-4" />
                <p>Conectando ao GoCall...</p>
            </div>
        );
    }

    const isConnectedToVoice = !!voiceChannel && !!voiceToken;
    const isFriendsRoute = pathname === '/friends' || pathname.startsWith('/friends/');
    const videoPortalTarget = (voiceRoomSlot ? voiceRoomSlot.el : null) ?? voiceRoomFallback;

    const missingThumbnailIdentities = participants
        .filter((p) => p.identity !== localIdentity && p.attributes?.screenSharing === 'true' && !screenShareThumbnails.has(p.identity))
        .map((p) => p.identity);

    const homeServerInCall = participants.filter((p) => p.attributes?.inCall === 'true');

    const contextValue: AppContextValue = {
        username,
        localIdentity,
        activeParticipants: participants,
        voiceChannel,
        voiceState,
        theaterMode,
        onTheaterModeChange: setTheaterMode,
        onJoinVoice: handleJoinVoice,
        onLeaveVoice: handleLeaveVoice,
        localThumbnail,
        screenShareThumbnails,
        screenShareViewState,
        setScreenShareViewState,
        skipAutoPauseOnJoin,
        setSkipAutoPauseOnJoin,
        registerVoiceRoomSlot,
        registerVoiceParticipantsSlot: setVoiceParticipantsSlot,
    };

    return (
        <div className="flex h-dvh bg-[#0F1012] text-[#EDEBE7] overflow-hidden font-sans antialiased">
            <LiveKitRoom
                video={false}
                audio={false}
                token={lobbyToken}
                serverUrl={liveKitUrl}
                options={ROOM_OPTIONS}
                data-lk-theme="default"
                className="flex flex-1 min-h-0 min-w-0"
            >
                <ParticipantsSpy onChange={setParticipants} />
                <LobbyIdentityReporter onIdentity={setLocalIdentity} />
                <RoomReconnectBridge onDisconnected={refreshLobbyConnection} />
                <LobbyPresence
                    voiceChannelId={voiceChannel?.id ?? null}
                    isSpeaking={voiceState?.isSpeaking ?? false}
                    isScreenSharing={voiceState?.isScreenShareEnabled ?? false}
                />
                <ScreenShareThumbnailBridge
                    thumbnail={localThumbnail}
                    onReceive={handleReceiveThumbnail}
                    requestFrom={missingThumbnailIdentities}
                />

                <div className="flex w-16 bg-[#0B0C0D] flex-col items-center py-4 gap-3 shrink-0 border-r border-white/4">
                    <Link
                        href="/friends"
                        className="relative group"
                        title="Início — amigos"
                    >
                        {isFriendsRoute && (
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand rounded-full" />
                        )}
                        <div
                            className={cn(
                                'w-11 h-11 rounded-2xl flex items-center justify-center transition-colors',
                                isFriendsRoute ? 'bg-brand text-[#0F1012]' : 'bg-[#1F2023] text-[#EDEBE7] hover:bg-[#26282c]'
                            )}
                        >
                            <Home size={20} />
                        </div>
                    </Link>

                    <div className="w-8 h-px bg-white/8 my-0.5" />

                    <Link
                        href={`/servers/${homeServerId}`}
                        className="relative group"
                        title={homeServerName}
                    >
                        {!isFriendsRoute && (
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand rounded-full" />
                        )}
                        <div className="w-11 h-11 rounded-2xl bg-[#1F2023] flex items-center justify-center transition-colors group-hover:bg-[#26282c]">
                            <Logo className="w-6 h-6" />
                        </div>

                        {homeServerInCall.length > 0 && (
                            <span className="absolute -bottom-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brand ring-2 ring-[#0B0C0D] text-[9px] font-bold text-white flex items-center justify-center">
                                {homeServerInCall.length}
                            </span>
                        )}

                        {homeServerInCall.length > 0 && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none">
                                <div className="bg-[#16171A] border border-white/8 rounded-xl shadow-lg px-3 py-2.5 whitespace-nowrap">
                                    <p className="text-[10px] font-medium text-[#8B8D93] uppercase tracking-wider mb-1.5">
                                        Em chamada — {homeServerName}
                                    </p>
                                    <div className="flex flex-col gap-1.5">
                                        {homeServerInCall.slice(0, 6).map((p) => (
                                            <div key={p.identity} className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-[#2A2D35] flex items-center justify-center text-[10px] font-medium shrink-0">
                                                    {(p.name || p.identity)[0]?.toUpperCase()}
                                                </div>
                                                <span className="text-[12px] text-[#EDEBE7]">{p.name || p.identity}</span>
                                            </div>
                                        ))}
                                        {homeServerInCall.length > 6 && (
                                            <p className="text-[11px] text-[#63656B]">+{homeServerInCall.length - 6} mais</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Link>
                </div>

                <AppContext.Provider value={contextValue}>
                    <div className="flex-1 flex min-w-0 min-h-0">
                        {children}
                    </div>

                    <div ref={setVoiceRoomFallback} className="hidden" />

                    {isConnectedToVoice && (
                        <LiveKitRoom
                            key={voiceChannel.id}
                            video={false}
                            audio={false}
                            token={voiceToken!}
                            serverUrl={liveKitUrl}
                            options={ROOM_OPTIONS}
                            className="contents"
                        >
                            <ParticipantAudioProvider>
                                <RoomReconnectBridge onDisconnected={handleVoiceDisconnected} />
                                <VoiceRoomBridge onStateChange={setVoiceState} onThumbnail={setLocalThumbnail} />
                                <RoomAudioRenderer />
                                <CallPresenceSounds />
                                {videoPortalTarget && createPortal(
                                    <VoiceRoom
                                        onLeave={handleLeaveVoice}
                                        theaterMode={theaterMode}
                                        onTheaterModeChange={setTheaterMode}
                                        channelName={voiceChannel.name}
                                        skipAutoPause={skipAutoPauseOnJoin}
                                    />,
                                    videoPortalTarget
                                )}
                                {voiceParticipantsSlot && createPortal(<VoiceParticipantsList />, voiceParticipantsSlot)}
                            </ParticipantAudioProvider>
                            <StartAudio
                                label="Clique para ativar o áudio"
                                className="fixed! top-auto! bottom-5! left-1/2! w-auto! -translate-x-1/2! transform-none! z-50! bg-brand! text-[#0F1012]! font-semibold! text-sm! py-2.5! px-5! rounded-xl! shadow-lg! hover:bg-brand-hover! transition-colors"
                            />
                        </LiveKitRoom>
                    )}
                </AppContext.Provider>
            </LiveKitRoom>
        </div>
    );
}
