import { useLocalParticipant } from '@livekit/components-react';
import { VideoPresets } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff } from 'lucide-react';
import { useState } from 'react';
import { playDiscordSound } from '@/lib/utils';

const RESOLUTIONS = [
    { label: '720p', preset: VideoPresets.h720 },
    { label: '1080p', preset: VideoPresets.h1080 },
    { label: '1440p', preset: VideoPresets.h1440 },
] as const;

export function CustomControlBar({ onLeave }: { onLeave: () => void }) {
    const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant();
    const [showShareMenu, setShowShareMenu] = useState(false);

    const startScreenShare = async (resolution: typeof RESOLUTIONS[number]['preset']) => {
        setShowShareMenu(false);
        try {
            await localParticipant.setScreenShareEnabled(true, {
                audio: true,
                resolution: resolution.resolution,
                contentHint: 'detail',
            });
        } catch (err) {
            console.error('Compartilhamento cancelado ou falhou', err);
        }
    };

    const handleLeave = async () => {
        await localParticipant.setMicrophoneEnabled(false);
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setScreenShareEnabled(false);
        await localParticipant.setAttributes({ inCall: 'false' });
        playDiscordSound('leave');
        onLeave();
    };
    return (
        <div className="h-20 bg-[#16171A] border-t border-white/4 flex items-center justify-center gap-2 shrink-0">
            <button
                onClick={() => {
                    const next = !isMicrophoneEnabled;
                    playDiscordSound(next ? 'unmute' : 'mute');
                    localParticipant.setMicrophoneEnabled(next).catch(console.error);
                }}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isMicrophoneEnabled
                    ? 'bg-[#1F2023] text-[#EDEBE7] hover:bg-[#26282c]'
                    : 'bg-[#F2555A]/15 text-[#F2555A] hover:bg-[#F2555A]/20'
                    }`}
                title={isMicrophoneEnabled ? 'Mutar' : 'Desmutar'}
            >
                {isMicrophoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            <button
                onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled).catch(console.error)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isCameraEnabled
                    ? 'bg-[#FF6B4A] text-[#0F1012] hover:bg-[#FF7D5F]'
                    : 'bg-[#1F2023] text-[#8B8D93] hover:bg-[#26282c] hover:text-[#EDEBE7]'
                    }`}
                title={isCameraEnabled ? 'Desligar câmera' : 'Ligar câmera'}
            >
                {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            <div className="relative">
                <button
                    onClick={() => isScreenShareEnabled
                        ? localParticipant.setScreenShareEnabled(false)
                        : setShowShareMenu(v => !v)
                    }
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isScreenShareEnabled
                        ? 'bg-[#FF6B4A] text-[#0F1012] hover:bg-[#FF7D5F]'
                        : 'bg-[#1F2023] text-[#8B8D93] hover:bg-[#26282c] hover:text-[#EDEBE7]'
                        }`}
                    title={isScreenShareEnabled ? 'Parar compartilhamento' : 'Compartilhar tela'}
                >
                    {isScreenShareEnabled ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
                </button>

                {showShareMenu && (
                    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#1F2023] rounded-xl p-1.5 shadow-xl border border-white/6 w-40">
                        {RESOLUTIONS.map(r => (
                            <button
                                key={r.label}
                                onClick={() => startScreenShare(r.preset)}
                                className="w-full text-left px-3 py-2 text-[13px] text-[#EDEBE7] hover:bg-white/5 rounded-lg transition-colors"
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-px h-6 bg-white/6 mx-2" />

            <button
                onClick={handleLeave}
                className="w-11 h-11 rounded-full bg-[#F2555A]/15 text-[#F2555A] hover:bg-[#F2555A] hover:text-[#0F1012] flex items-center justify-center transition-colors"
                title="Sair"
            >
                <PhoneOff size={18} />
            </button>
        </div>
    );
}