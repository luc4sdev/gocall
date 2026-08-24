'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Layout } from '@/components/layout/Layout';
import { Hash, Volume2 } from 'lucide-react';
import { VoiceRoom } from '@/components/call/VoiceRoom';
import { Logo } from './Logo';
import { Participant, type RoomOptions } from 'livekit-client';
import { LiveKitRoom, RoomAudioRenderer, StartAudio, useLocalParticipant, useParticipants } from '@livekit/components-react';
import { ChatChannel } from '@/components/chat/ChatChanel';
import { VoiceChannelGate } from '@/components/call/VoiceChannelGate';
import { ParticipantAudioProvider } from '@/components/call/ParticipantAudioContext';
import { CallPresenceSounds } from '@/components/call/CallPresenceSounds';
import { LobbyPresence } from '@/components/call/LobbyPresence';
import { VoiceRoomBridge, type VoiceControlState } from '@/components/call/VoiceRoomBridge';
import { VoiceParticipantsList } from '@/components/call/VoiceParticipantsList';
import { ChatBridge, type ChatBridgeState } from '@/components/chat/ChatBridge';
import { ChannelSyncBridge, type BroadcastChannelSync, type ChannelSyncMessage } from '@/components/layout/ChannelSyncBridge';
import { LobbyReconnectBridge } from '@/components/layout/LobbyReconnectBridge';
import type { ServerDTO, ChannelDTO } from '@/lib/types';

const ROOM_OPTIONS: RoomOptions = { dynacast: true };

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

export function HomeClient({ username }: { username: string }) {
  const [server, setServer] = useState<ServerDTO | null>(null);
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [lobbyToken, setLobbyToken] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localIdentity, setLocalIdentity] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [voiceChannel, setVoiceChannel] = useState<ChannelDTO | null>(null);
  const [voiceToken, setVoiceToken] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceControlState | null>(null);
  const [theaterMode, setTheaterMode] = useState(false);
  const voiceTokenCacheRef = useRef<Map<string, string>>(new Map());
  const [voiceParticipantsSlot, setVoiceParticipantsSlot] = useState<HTMLDivElement | null>(null);
  const [chatBridge, setChatBridge] = useState<ChatBridgeState | null>(null);
  const broadcastChannelSyncRef = useRef<BroadcastChannelSync | null>(null);

  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

  const handleLeaveVoice = useCallback(() => {
    setVoiceChannel(null);
    setVoiceToken(null);
    setVoiceState(null);
    setTheaterMode(false);
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
      setVoiceChannel(channel);
      setVoiceToken(data.token);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, []);

  const applyChannelCreated = useCallback((channel: ChannelDTO) => {
    setServer((prev) => {
      if (!prev) return prev;
      if (prev.channels.some((c) => c.id === channel.id)) return prev;
      return { ...prev, channels: [...prev.channels, channel] };
    });
  }, []);

  const applyChannelDeleted = useCallback((channelId: string) => {
    setServer((prev) => {
      if (!prev) return prev;
      const remaining = prev.channels.filter((c) => c.id !== channelId);

      setActiveChannel((current) => {
        if (current !== channelId) return current;
        const fallback = remaining.find((c) => c.type === 'TEXT') ?? remaining[0];
        return fallback?.id ?? '';
      });

      setVoiceChannel((current) => {
        if (current?.id !== channelId) return current;
        handleLeaveVoice();
        return null;
      });

      return { ...prev, channels: remaining };
    });
  }, [handleLeaveVoice]);

  const handleChannelCreated = useCallback((channel: ChannelDTO) => {
    applyChannelCreated(channel);
    broadcastChannelSyncRef.current?.({ type: 'created', channel });
  }, [applyChannelCreated]);

  const handleChannelDeleted = useCallback((channelId: string) => {
    applyChannelDeleted(channelId);
    broadcastChannelSyncRef.current?.({ type: 'deleted', channelId });
  }, [applyChannelDeleted]);

  const handleChannelSyncMessage = useCallback((message: ChannelSyncMessage) => {
    if (message.type === 'created') {
      applyChannelCreated({ ...message.channel, canDelete: false });
    } else {
      applyChannelDeleted(message.channelId);
    }
  }, [applyChannelCreated, applyChannelDeleted]);

  const handleBroadcastReady = useCallback((broadcast: BroadcastChannelSync) => {
    broadcastChannelSyncRef.current = broadcast;
  }, []);

  const handleLobbyDisconnected = useCallback(() => {
    if (!server) return;
    const lobbyRoomName = `lobby-${server.id}`;
    fetch(`/api/livekit?room=${encodeURIComponent(lobbyRoomName)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.token) setLobbyToken(data.token);
      })
      .catch((err) => console.error('Falha ao reconectar ao lobby:', err));
  }, [server]);

  useEffect(() => {
    const init = async () => {
      try {
        const serverRes = await fetch('/api/server');
        const serverData = await serverRes.json();
        if (!serverRes.ok || !serverData.server) {
          setError(serverData.error || 'Não foi possível carregar o servidor.');
          return;
        }

        const loadedServer: ServerDTO = serverData.server;
        setServer(loadedServer);

        const textChannel = loadedServer.channels.find((c) => c.type === 'TEXT');
        const voiceChannelFallback = loadedServer.channels.find((c) => c.type === 'VOICE');
        setActiveChannel((textChannel ?? voiceChannelFallback)?.id ?? '');

        const lobbyRoomName = `lobby-${loadedServer.id}`;
        const res = await fetch(`/api/livekit?room=${encodeURIComponent(lobbyRoomName)}`);
        const data = await res.json();
        if (data.token) setLobbyToken(data.token);
        else setError('Erro ao buscar token: ' + data.error);
      } catch (err) {
        console.error(err);
        setError('Falha na conexão com o servidor.');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!server) return;
    const channel = server.channels.find((c) => c.id === activeChannel);
    if (!channel || channel.type !== 'VOICE' || !channel.roomName) return;
    if (voiceTokenCacheRef.current.has(channel.id)) return;
    if (voiceChannel?.id === channel.id) return;

    let cancelled = false;
    fetch(`/api/livekit?room=${encodeURIComponent(channel.roomName)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.token) voiceTokenCacheRef.current.set(channel.id, data.token);
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [server, activeChannel, voiceChannel]);

  if (error) {
    return (
      <div className="flex h-dvh bg-[#16171A] items-center justify-center flex-col text-gray-300 text-center px-4">
        <p className="text-[#F2555A] font-semibold mb-2">Não foi possível conectar</p>
        <p className="text-sm text-[#8B8D93]">{error}</p>
      </div>
    );
  }

  if (!lobbyToken || !server) {
    return (
      <div className="flex h-dvh bg-[#16171A] items-center justify-center flex-col text-gray-300">
        <Logo className="w-10 h-10 animate-pulse mb-4" />
        <p>Conectando ao GoCall...</p>
      </div>
    );
  }

  const activeChannelData = server.channels.find((c) => c.id === activeChannel);

  const isConnectedToVoice = !!voiceChannel && !!voiceToken;
  const isViewingOwnCall = isConnectedToVoice && activeChannelData?.id === voiceChannel.id;

  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={lobbyToken}
      serverUrl={liveKitUrl}
      options={ROOM_OPTIONS}
      data-lk-theme="default"
      className="flex-1 flex flex-col"
    >
      <ParticipantsSpy onChange={setParticipants} />
      <LobbyIdentityReporter onIdentity={setLocalIdentity} />
      <LobbyReconnectBridge onDisconnected={handleLobbyDisconnected} />
      <LobbyPresence
        voiceChannelId={voiceChannel?.id ?? null}
        isSpeaking={voiceState?.isSpeaking ?? false}
        isScreenSharing={voiceState?.isScreenShareEnabled ?? false}
      />
      <ChatBridge onChange={setChatBridge} />
      <ChannelSyncBridge onMessage={handleChannelSyncMessage} onReady={handleBroadcastReady} />

      <Layout
        serverName={server.name}
        serverId={server.id}
        channels={server.channels}
        activeChannelId={activeChannel}
        onChannelSelect={setActiveChannel}
        onChannelCreated={handleChannelCreated}
        onChannelDeleted={handleChannelDeleted}
        localIdentity={localIdentity}
        username={username}
        voiceChannelId={voiceChannel?.id ?? null}
        voiceState={voiceState}
        onLeaveCall={handleLeaveVoice}
        activeParticipants={participants}
        hideMembersSidebar={isViewingOwnCall && theaterMode}
        voiceParticipantsSlotRef={setVoiceParticipantsSlot}
      >
        <div className="h-14 px-3 sm:px-5 flex items-center min-w-0 border-b border-white/4 bg-[#16171A] shrink-0 z-10">
          {activeChannelData?.type === 'TEXT' ? <Hash size={20} className="text-[#63656B] mr-2 shrink-0" /> : <Volume2 size={20} className="text-[#63656B] mr-2 shrink-0" />}
          <span className="font-display font-semibold text-[15px] truncate min-w-0">
            {activeChannelData?.name}
          </span>
        </div>


        <div className={isViewingOwnCall ? 'hidden' : 'flex-1 flex flex-col min-h-0'}>
          {activeChannelData?.type === 'TEXT' ? (
            <ChatChannel
              key={activeChannelData.id}
              channelId={activeChannelData.id}
              chatMessages={chatBridge?.chatMessages ?? []}
              sendMessage={chatBridge?.send ?? null}
            />
          ) : activeChannelData?.type === 'VOICE' && !isViewingOwnCall ? (
            <VoiceChannelGate
              key={activeChannelData.id}
              channelName={activeChannelData.name}
              onJoin={() => handleJoinVoice(activeChannelData)}
            />
          ) : null}
        </div>


        {isConnectedToVoice && (
          <div className={isViewingOwnCall ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
            <LiveKitRoom
              key={voiceChannel.id}
              video={false}
              audio={false}
              token={voiceToken!}
              serverUrl={liveKitUrl}
              options={ROOM_OPTIONS}
              className="flex-1 flex flex-col min-h-0"
            >
              <ParticipantAudioProvider>
                <VoiceRoomBridge onStateChange={setVoiceState} />
                <RoomAudioRenderer />
                <CallPresenceSounds />
                <VoiceRoom
                  onLeave={handleLeaveVoice}
                  theaterMode={theaterMode}
                  onTheaterModeChange={setTheaterMode}
                  channelName={voiceChannel.name}
                />
                {voiceParticipantsSlot && createPortal(<VoiceParticipantsList />, voiceParticipantsSlot)}
              </ParticipantAudioProvider>
              <StartAudio
                label="Clique para ativar o áudio"
                className="fixed! top-auto! bottom-5! left-1/2! w-auto! -translate-x-1/2! transform-none! z-50! bg-brand! text-[#0F1012]! font-semibold! text-sm! py-2.5! px-5! rounded-xl! shadow-lg! hover:bg-brand-hover! transition-colors"
              />
            </LiveKitRoom>
          </div>
        )}
      </Layout>
    </LiveKitRoom>
  );
}
