'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Hash } from 'lucide-react';
import { VoiceRoom } from '@/components/call/VoiceRoom';
import { Participant } from 'livekit-client';

export default function Home() {
  const [activeChannel, setActiveChannel] = useState<string>('geral-texto');

  const [token, setToken] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

  const handleChannelSelect = (channelId: string) => {
    setActiveChannel(channelId);
  };

  const joinVoiceChannel = async () => {
    setIsConnecting(true);
    try {
      const roomName = 'GoCall-Geral';
      const username = `User_${Math.floor(Math.random() * 1000)}`;

      const res = await fetch(`/api/livekit?room=${roomName}&username=${username}`);
      const data = await res.json();

      if (data.token) {
        setToken(data.token);
      } else {
        alert("Erro ao buscar token: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Falha na conexão com o servidor.");
    } finally {
      setIsConnecting(false);
    }
  };

  const leaveVoiceChannel = () => {
    setToken('');
  };

  return (
    <Layout
      activeChannelId={activeChannel}
      onChannelSelect={handleChannelSelect}
      isConnected={!!token}
      activeParticipants={participants}
    >
      <div className="h-12 px-4 flex items-center shadow-sm border-b border-[#1f2023]/30 bg-[#313338] shrink-0 z-10">
        <Hash size={24} className="text-gray-400 mr-2" />
        <span className="font-bold text-[15px]">
          {activeChannel === 'geral-texto' ? 'geral' : 'Geral'}
        </span>
      </div>

      {activeChannel === 'geral-voz' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-[#000000]">
          {!token ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#313338]">
              <div className="bg-[#2B2D31] p-8 rounded-lg flex flex-col items-center text-center max-w-sm">
                <div className="w-16 h-16 bg-purple-600/20 text-[#5865F2] rounded-full flex items-center justify-center mb-4">
                  <Hash size={32} />
                </div>
                <h2 className="text-xl font-bold mb-2 text-gray-100">Geral</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Entre na chamada para conversar por voz e compartilhar sua tela com o servidor.
                </p>
                <button
                  onClick={joinVoiceChannel}
                  disabled={isConnecting}
                  className="w-full bg-purple-600 hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded transition-colors"
                >
                  {isConnecting ? "Conectando..." : "Entrar no Canal de Voz"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col relative bg-[#313338]">
              <VoiceRoom
                token={token}
                serverUrl={liveKitUrl}
                onDisconnected={leaveVoiceChannel}
                onParticipantsChange={setParticipants}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end p-4">
          <div className="flex items-center gap-4 p-4 mt-auto">
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-xs overflow-hidden">
              <p>L</p>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-gray-100 hover:underline cursor-pointer">Sistema</span>
                <span className="text-xs text-gray-400">Hoje às 12:00</span>
              </div>
              <p className="text-gray-300 mt-1 text-[15px]">Bem vindo ao novo servidor! Clique em <span className="font-bold text-gray-100">Geral</span> para testar a call.</p>
            </div>
          </div>

          <div className="mt-4 bg-[#383A40] rounded-lg p-3 flex items-center gap-3">
            <div className="w-6 h-6 bg-[#4E5058] rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs">+</span>
            </div>
            <input
              type="text"
              placeholder="Conversar em #geral"
              className="bg-transparent border-none outline-none flex-1 text-gray-200 placeholder:text-gray-500"
              disabled
            />
          </div>
        </div>
      )}
    </Layout>
  );
}