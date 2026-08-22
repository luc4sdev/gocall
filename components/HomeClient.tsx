'use client';

import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Hash, Loader2, Volume2 } from 'lucide-react';
import { VoiceRoom } from '@/components/call/VoiceRoom';

import { Participant } from 'livekit-client';
import { LiveKitRoom, RoomAudioRenderer, StartAudio, useParticipants } from '@livekit/components-react';
import { ChatChannel } from '@/components/chat/ChatChanel';
import { VoiceChannelGate } from '@/components/call/VoiceChannelGate';
import { ParticipantAudioProvider } from '@/components/call/ParticipantAudioContext';
import type { ServerDTO } from '@/lib/types';

function ParticipantsSpy({ onChange }: { onChange: (p: Participant[]) => void }) {
  const participants = useParticipants();
  useEffect(() => { onChange(participants); }, [participants, onChange]);
  return null;
}

export function HomeClient({ username }: { username: string }) {
  const [server, setServer] = useState<ServerDTO | null>(null);
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [voiceJoined, setVoiceJoined] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [error, setError] = useState<string>('');

  const handleLeaveVoice = () => {
    setVoiceJoined(false);
    setTheaterMode(false);
  };

  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

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
        const voiceChannel = loadedServer.channels.find((c) => c.type === 'VOICE');
        setActiveChannel((textChannel ?? voiceChannel)?.id ?? '');

        const roomName = voiceChannel?.roomName || 'GoCall-Geral';
        const res = await fetch(`/api/livekit?room=${roomName}`);
        const data = await res.json();
        if (data.token) setToken(data.token);
        else setError('Erro ao buscar token: ' + data.error);
      } catch (err) {
        console.error(err);
        setError('Falha na conexão com o servidor.');
      }
    };
    init();
  }, []);

  if (error) {
    return (
      <div className="flex h-screen bg-[#16171A] items-center justify-center flex-col text-gray-300 text-center px-4">
        <p className="text-[#F2555A] font-semibold mb-2">Não foi possível conectar</p>
        <p className="text-sm text-[#8B8D93]">{error}</p>
      </div>
    );
  }

  if (!token || !server) {
    return (
      <div className="flex h-screen bg-[#16171A] items-center justify-center flex-col text-gray-300">
        <Loader2 size={40} className="animate-spin text-[#FF6B4A] mb-4" />
        <p>Conectando ao GoCall...</p>
      </div>
    );
  }

  const activeChannelData = server.channels.find((c) => c.id === activeChannel);

  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={liveKitUrl}
      data-lk-theme="default"
      className="flex-1 flex flex-col"
    >
      <ParticipantAudioProvider>
        <ParticipantsSpy onChange={setParticipants} />
        {voiceJoined && <RoomAudioRenderer />}
        <StartAudio
          label="Clique para ativar o áudio"
          className="fixed! bottom-5! left-1/2! -translate-x-1/2! z-50! bg-[#FF6B4A]! text-[#0F1012]! font-semibold! text-sm! py-2.5! px-5! rounded-xl! shadow-lg! hover:bg-[#FF7D5F]! transition-colors"
        />

        <Layout
          serverName={server.name}
          channels={server.channels}
          activeChannelId={activeChannel}
          onChannelSelect={setActiveChannel}
          isConnected={voiceJoined}
          onLeaveCall={handleLeaveVoice}
          activeParticipants={participants}
          username={username}
          hideMembersSidebar={theaterMode}
        >
          <div className="h-14 px-5 flex items-center border-b border-white/4 bg-[#16171A] shrink-0 z-10">
            {activeChannelData?.type === 'TEXT' ? <Hash size={20} className="text-[#63656B] mr-2" /> : <Volume2 size={20} className="text-[#63656B] mr-2" />}
            <span className="font-display font-semibold text-[15px]">
              {activeChannelData?.name}
            </span>
          </div>

          {activeChannelData?.type === 'TEXT' ? (
            <ChatChannel key={activeChannelData.id} channelId={activeChannelData.id} />
          ) : voiceJoined ? (
            <VoiceRoom
              onLeave={handleLeaveVoice}
              theaterMode={theaterMode}
              onTheaterModeChange={setTheaterMode}
            />
          ) : (
            <VoiceChannelGate onJoin={() => setVoiceJoined(true)} />
          )}
        </Layout>
      </ParticipantAudioProvider>
    </LiveKitRoom>
  );
}
