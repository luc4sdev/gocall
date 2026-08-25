import { useLocalParticipant } from '@livekit/components-react';
import { ScreenSharePresets, VideoPreset } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, Monitor } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { enableMicrophone, playSound } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

const RESOLUTIONS = [
    {
        label: '480p',
        description: 'Mais leve — menos travamento em conexões fracas',
        preset: new VideoPreset(854, 480, 700_000, 30, 'medium'),
        contentHint: 'detail',
    },
    {
        label: '720p',
        description: 'Boa qualidade, menor consumo de rede',
        preset: ScreenSharePresets.h720fps30,
        contentHint: 'detail',
    },
    {
        label: '720p 60fps',
        description: 'Fluido e mais leve que o 1080p 60fps',
        preset: new VideoPreset(1280, 720, 3_000_000, 60, 'high'),
        contentHint: 'motion',
    },
    {
        label: '1080p',
        description: 'Recomendado para a maioria das telas',
        preset: ScreenSharePresets.h1080fps30,
        contentHint: 'detail',
    },
    {
        label: '1080p 60fps',
        description: 'Mais fluido — ideal para vídeos e jogos',
        preset: new VideoPreset(1920, 1080, 12_000_000, 60, 'high'),
        contentHint: 'motion',
    },
    {
        label: '1440p',
        description: 'Alta definição, exige mais banda',
        preset: new VideoPreset(2560, 1440, 8_000_000, 30, 'high'),
        contentHint: 'detail',
    },
] as const;

export function CustomControlBar({ onLeave }: { onLeave: () => void }) {
    const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant();
    const [showShareDialog, setShowShareDialog] = useState(false);

    const prevScreenShareRef = useRef(isScreenShareEnabled);
    const isLeavingRef = useRef(false);
    useEffect(() => {
        if (prevScreenShareRef.current !== isScreenShareEnabled) {
            if (!isLeavingRef.current) {
                playSound(isScreenShareEnabled ? 'screenshare-start' : 'screenshare-stop');
            }
            prevScreenShareRef.current = isScreenShareEnabled;
        }
    }, [isScreenShareEnabled]);

    const startScreenShare = async (option: typeof RESOLUTIONS[number]) => {
        setShowShareDialog(false);
        try {
            await localParticipant.setScreenShareEnabled(true, {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
                resolution: option.preset.resolution,
                contentHint: option.contentHint,
            },
                {
                    screenShareEncoding: option.preset.encoding,
                    videoCodec: 'av1',
                }
            );
        } catch (err) {
            console.error('Compartilhamento cancelado ou falhou', err);
        }
    };

    const handleLeave = async () => {
        isLeavingRef.current = true;
        await localParticipant.setMicrophoneEnabled(false);
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setScreenShareEnabled(false);
        playSound('leave');
        onLeave();
    };
    return (
        <div className="min-h-20 pb-[env(safe-area-inset-bottom)] bg-[#16171A] border-t border-white/4 flex items-center justify-center gap-2 shrink-0">
            <button
                onClick={async () => {
                    const next = !isMicrophoneEnabled;
                    playSound(next ? 'unmute' : 'mute');
                    if (next) {
                        enableMicrophone(localParticipant).catch(console.error);
                    } else {
                        localParticipant.setMicrophoneEnabled(false).catch(console.error);
                    }
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
                    ? 'bg-brand text-[#0F1012] hover:bg-brand-hover'
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
                    ? 'bg-brand text-[#0F1012] hover:bg-brand-hover'
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

                    <div className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto">
                        {RESOLUTIONS.map((r) => (
                            <button
                                key={r.label}
                                onClick={() => startScreenShare(r)}
                                className="group w-full flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-[#1F2023] hover:bg-[#26282c] hover:border-brand/40 px-4 py-3 text-left transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[14px] font-medium text-[#EDEBE7] group-hover:text-brand transition-colors">
                                        {r.label}
                                    </span>
                                    <span className="text-[12px] text-[#8B8D93]">{r.description}</span>
                                </div>
                                <Monitor size={18} className="text-[#63656B] group-hover:text-brand transition-colors shrink-0" />
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