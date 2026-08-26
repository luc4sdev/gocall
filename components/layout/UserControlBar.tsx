'use client';

import { useState } from 'react';
import { Headphones, Mic, MicOff, HeadphoneOff, PhoneOff, Settings } from 'lucide-react';
import { useAppContext } from '@/components/AppContext';
import { SettingsModal } from './SettingsModal';

export function UserControlBar() {
    const { username, voiceChannel, voiceState, onLeaveVoice } = useAppContext();
    const [showSettings, setShowSettings] = useState(false);

    const isInRoom = voiceState !== null;
    const micMuted = isInRoom ? !voiceState.isMicrophoneEnabled : false;
    const isDeafened = voiceState?.isDeafened ?? false;

    const toggleMic = () => voiceState?.toggleMic();
    const toggleDeafen = () => voiceState?.toggleDeafen();

    return (
        <>
            <div className="min-h-16 px-3 pb-[env(safe-area-inset-bottom)] flex items-center justify-between shrink-0 border-t border-white/4">
                <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/3 cursor-pointer flex-1 min-w-0">
                    <div className="relative w-8 h-8 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium shrink-0">
                        {(username || '?')[0]?.toUpperCase()}
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-[#16171A]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-medium truncate">{username || 'Conectando...'}</span>
                        <span className="text-[11px] text-[#63656B] truncate">
                            {isInRoom ? `Em chamada — ${voiceChannel?.name ?? ''}` : 'Online'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-0.5">
                    {isInRoom && (
                        <button
                            onClick={onLeaveVoice}
                            className="p-2 rounded-lg text-[#63656B] hover:bg-[#F2555A]/15 hover:text-[#F2555A] transition-colors"
                            title="Sair da chamada"
                        >
                            <PhoneOff size={16} />
                        </button>
                    )}

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

            <SettingsModal open={showSettings} onOpenChange={setShowSettings} username={username} />
        </>
    );
}
