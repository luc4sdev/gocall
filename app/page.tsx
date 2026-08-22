'use client';

import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Hash, Loader2, Volume2 } from 'lucide-react';
import { VoiceRoom } from '@/components/call/VoiceRoom';

import { Participant } from 'livekit-client';
import { LiveKitRoom, RoomAudioRenderer, StartAudio, useParticipants } from '@livekit/components-react';
import { ChatChannel } from '@/components/chat/ChatChanel';
import { VoiceChannelGate } from '@/components/call/VoiceChannelGate';
import { getStoredUsername } from '@/lib/utils';

function ParticipantsSpy({ onChange }: { onChange: (p: Participant[]) => void }) {
  const participants = useParticipants();
  useEffect(() => { onChange(participants); }, [participants, onChange]);
  return null;
}

export default function Home() {
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [token, setToken] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [voiceJoined, setVoiceJoined] = useState(false);

  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

  useEffect(() => {
    const init = async () => {
      try {
        const roomName = 'GoCall-Geral';
        const resolvedUsername = getStoredUsername();
        const res = await fetch(`/api/livekit?room=${roomName}&username=${encodeURIComponent(resolvedUsername)}`);
        const data = await res.json();
        if (data.token) {
          setUsername(resolvedUsername);
          setToken(data.token);
        }
        else alert("Erro ao buscar token: " + data.error);
      } catch (err) {
        console.error(err);
        alert("Falha na conexão com o servidor.");
      }
    };
    init();
  }, []);

  if (!token) {
    return (
      <div className="flex h-screen bg-[#16171A] items-center justify-center flex-col text-gray-300">
        <Loader2 size={40} className="animate-spin text-[#FF6B4A] mb-4" />
        <p>Conectando ao GoCall...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={liveKitUrl}
      data-lk-theme="default"
      className="flex-1 flex flex-col"
    >
      <ParticipantsSpy onChange={setParticipants} />
      <RoomAudioRenderer />
      <StartAudio
        label="Clique para ativar o áudio"
        className="fixed! bottom-5! left-1/2! -translate-x-1/2! z-50! bg-[#FF6B4A]! text-[#0F1012]! font-semibold! text-sm! py-2.5! px-5! rounded-xl! shadow-lg! hover:bg-[#FF7D5F]! transition-colors"
      />

      <Layout
        activeChannelId={activeChannel}
        onChannelSelect={setActiveChannel}
        isConnected={voiceJoined}
        onLeaveCall={() => setVoiceJoined(false)}
        activeParticipants={participants}
        username={username}
      >
        <div className="h-14 px-5 flex items-center border-b border-white/4 bg-[#16171A] shrink-0 z-10">
          {activeChannel === 'general' ? <Hash size={20} className="text-[#63656B] mr-2" /> : <Volume2 size={20} className="text-[#63656B] mr-2" />}
          <span className="font-display font-semibold text-[15px]">
            {activeChannel === 'general' ? 'geral' : 'Geral'}
          </span>
        </div>

        {activeChannel === 'general' ? (
          <ChatChannel />
        ) : voiceJoined ? (
          <VoiceRoom onLeave={() => setVoiceJoined(false)} />
        ) : (
          <VoiceChannelGate onJoin={() => setVoiceJoined(true)} />
        )}
      </Layout>
    </LiveKitRoom>
  );
}