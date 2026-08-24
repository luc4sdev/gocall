'use client';

import { Volume2 } from 'lucide-react';
import { useState } from 'react';

export function VoiceChannelGate({ channelName, onJoin }: { channelName: string; onJoin: () => Promise<boolean> }) {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleJoin = async () => {
        setIsConnecting(true);
        const success = await onJoin();
        if (!success) setIsConnecting(false);
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0F1012]">
            <div className="flex flex-col items-center text-center max-w-sm">
                <div className="relative w-16 h-16 mb-5">
                    <div className="absolute inset-0 rounded-full bg-brand/10 animate-ping" />
                    <div className="relative w-16 h-16 bg-[#1F2023] text-brand rounded-full flex items-center justify-center">
                        <Volume2 size={26} />
                    </div>
                </div>
                <h2 className="font-display font-semibold text-lg mb-1.5 text-[#EDEBE7]">{channelName}</h2>
                <p className="text-[13px] text-[#8B8D93] mb-6 leading-relaxed">
                    Entre na chamada para conversar por voz e compartilhar sua tela com o servidor.
                </p>
                <button
                    onClick={handleJoin}
                    disabled={isConnecting}
                    className="w-full bg-brand hover:bg-brand-hover disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-[#0F1012] font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors"
                >
                    {isConnecting ? 'Conectando...' : 'Entrar no canal de voz'}
                </button>
            </div>
        </div>
    );
}
