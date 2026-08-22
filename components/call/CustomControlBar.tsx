import { useLocalParticipant } from '@livekit/components-react';
import { VideoPresets } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, Monitor } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { playDiscordSound } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

const RESOLUTIONS = [
    { label: '720p', description: 'Boa qualidade, menor consumo de rede', preset: VideoPresets.h720 },
    { label: '1080p', description: 'Recomendado para a maioria das telas', preset: VideoPresets.h1080 },
    { label: '1440p', description: 'Alta definição, exige mais banda', preset: VideoPresets.h1440 },
] as const;

export function CustomControlBar({ onLeave }: { onLeave: () => void }) {
    const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant();
    const [showShareDialog, setShowShareDialog] = useState(false);

    const prevScreenShareRef = useRef(isScreenShareEnabled);
    const isLeavingRef = useRef(false);
    useEffect(() => {
        if (prevScreenShareRef.current !== isScreenShareEnabled) {
            if (!isLeavingRef.current) {
                playDiscordSound(isScreenShareEnabled ? 'screenshare-start' : 'screenshare-stop');
            }
            prevScreenShareRef.current = isScreenShareEnabled;
        }
    }, [isScreenShareEnabled]);

    const startScreenShare = async (resolution: typeof RESOLUTIONS[number]['preset']) => {
        setShowShareDialog(false);
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
        isLeavingRef.current = true;
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

            <button
                onClick={() => isScreenShareEnabled
                    ? localParticipant.setScreenShareEnabled(false)
                    : setShowShareDialog(true)
                }
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isScreenShareEnabled
                    ? 'bg-[#FF6B4A] text-[#0F1012] hover:bg-[#FF7D5F]'
                    : 'bg-[#1F2023] text-[#8B8D93] hover:bg-[#26282c] hover:text-[#EDEBE7]'
                    }`}
                title={isScreenShareEnabled ? 'Parar compartilhamento' : 'Compartilhar tela'}
            >
                {isScreenShareEnabled ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
            </button>

            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogContent className="bg-[#16171A] ring-white/6 sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-[#EDEBE7]">Compartilhar tela</DialogTitle>
                        <DialogDescription className="text-[#8B8D93]">
                            Escolha a qualidade da transmissão.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-2">
                        {RESOLUTIONS.map((r) => (
                            <button
                                key={r.label}
                                onClick={() => startScreenShare(r.preset)}
                                className="group w-full flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-[#1F2023] hover:bg-[#26282c] hover:border-[#FF6B4A]/40 px-4 py-3 text-left transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[14px] font-medium text-[#EDEBE7] group-hover:text-[#FF6B4A] transition-colors">
                                        {r.label}
                                    </span>
                                    <span className="text-[12px] text-[#8B8D93]">{r.description}</span>
                                </div>
                                <Monitor size={18} className="text-[#63656B] group-hover:text-[#FF6B4A] transition-colors shrink-0" />
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

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