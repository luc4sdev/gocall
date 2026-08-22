import React, { useState } from 'react';
import { Hash, Volume2, Settings, Headphones, Mic, MicOff } from 'lucide-react';

interface DiscordLayoutProps {
    children: React.ReactNode;
    activeChannelId: string;
    onChannelSelect: (channelId: string) => void;
    isConnected: boolean;
    activeParticipants?: any[];
}

export function Layout({ children, activeChannelId, onChannelSelect, isConnected, activeParticipants = [] }: DiscordLayoutProps) {
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    return (
        <div className="flex h-screen bg-[#313338] text-gray-100 overflow-hidden font-sans">

            <div className="w-18 bg-[#1E1F22] flex flex-col items-center py-3 gap-2 shrink-0 border-r border-[#1e1f22] z-20">
                <div className="w-12 h-12 bg-purple-600 rounded-[16px] flex items-center justify-center cursor-pointer transition-all hover:rounded-[12px] shadow-lg">
                    <span className="font-bold text-white text-lg">GO</span>
                </div>
                <div className="w-8 h-0.5 bg-[#313338] rounded-full my-1" />
            </div>

            <div className="w-60 bg-[#2B2D31] flex flex-col shrink-0 z-10">
                <div className="h-12 px-4 flex items-center shadow-sm font-bold text-[15px] border-b border-[#1f2023]/30">
                    Servidor Oficial
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    <div className="mt-4 mb-1 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Canais de Texto
                    </div>
                    <button
                        onClick={() => onChannelSelect('geral-texto')}
                        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md mb-0.5 text-base transition-colors
              ${activeChannelId === 'geral-texto' ? 'bg-[#404249] text-white' : 'text-gray-400 hover:bg-[#35373C] hover:text-gray-300'}`}
                    >
                        <Hash size={20} className="text-gray-500 shrink-0" />
                        <span className="truncate">geral</span>
                    </button>

                    <div className="mt-4 mb-1 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Canais de Voz
                    </div>
                    <button
                        onClick={() => onChannelSelect('geral-voz')}
                        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-base transition-colors
              ${activeChannelId === 'geral-voz' ? 'bg-[#404249] text-white' : 'text-gray-400 hover:bg-[#35373C] hover:text-gray-300'}`}
                    >
                        <Volume2 size={20} className="text-gray-500 shrink-0" />
                        <span className="truncate">Geral</span>
                    </button>

                    {isConnected && activeChannelId === 'geral-voz' && (
                        <div className="ml-7 mt-1 flex flex-col gap-1">
                            {activeParticipants.map((p) => (
                                <div key={p.identity} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#35373c] cursor-pointer group">
                                    <div className="relative">
                                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs overflow-hidden shrink-0">
                                            <p>{p.name?.[0] || p.identity?.[0]}</p>
                                        </div>

                                        {p.isMicrophoneEnabled ? (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#2B2D31]" />
                                        ) : (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#2B2D31] rounded-full flex items-center justify-center">
                                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-sm text-gray-300 group-hover:text-white truncate">
                                        {p.name || p.identity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                <div className="h-13 bg-[#232428] px-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 p-1 rounded-md hover:bg-[#3c3d42] cursor-pointer flex-1 min-w-0">
                        <div className="relative w-8 h-8 rounded-full bg-gray-600 overflow-hidden shrink-0">
                            <p>L</p>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#232428]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold truncate">Lucas</span>
                            <span className="text-xs text-gray-400 truncate">Online</span>
                        </div>
                    </div>

                    <div className="flex items-center text-gray-400">
                        {/* Botão de Microfone Local */}
                        <button
                            onClick={() => setIsMicMuted(!isMicMuted)} // Adicione o [isMicMuted, setIsMicMuted] = useState(false) no início do componente
                            className={`p-1.5 rounded-md transition-colors ${isMicMuted
                                ? 'text-red-400 hover:text-red-500'
                                : 'hover:bg-[#3c3d42] hover:text-gray-200'
                                }`}
                            title={isMicMuted ? "Desmutar" : "Mutar"}
                        >
                            {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>

                        {/* Botão de Fone Local */}
                        <button
                            onClick={() => setIsDeafened(!isDeafened)} // Adicione o [isDeafened, setIsDeafened] = useState(false) no início do componente
                            className={`p-1.5 rounded-md transition-colors relative ${isDeafened
                                ? 'text-red-400 hover:text-red-500'
                                : 'hover:bg-[#3c3d42] hover:text-gray-200'
                                }`}
                            title={isDeafened ? "Desensurdecer" : "Ensurdecer"}
                        >
                            <Headphones size={18} />
                            {/* O risco cruzado simulando o mute do fone */}
                            {isDeafened && <div className="absolute w-5 h-0.5 bg-red-400 rotate-45 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-[#232428]" />}
                        </button>

                        <button className="p-1.5 hover:bg-[#3c3d42] rounded-md hover:text-gray-200 transition-colors" title="Configurações">
                            <Settings size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
                {children}
            </div>

        </div>
    );
}