'use client';

import { Loader2, Phone, PhoneOff } from 'lucide-react';
import type { PrivateCallState } from './usePrivateCall';

interface PrivateCallOverlayProps {
    call: PrivateCallState;
    willLeaveCurrentCall?: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

export function PrivateCallOverlay({ call, willLeaveCurrentCall, onAccept, onDecline }: PrivateCallOverlayProps) {
    if (call.status === 'active') return null;

    const isIncoming = call.status === 'incoming';

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(360px,calc(100vw-2rem))]">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16171A] shadow-2xl px-4 py-3">
                <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-[#2A2D35] flex items-center justify-center text-[15px] font-medium">
                        {call.peerName[0]?.toUpperCase()}
                    </div>
                    <div className={`absolute inset-0 rounded-full border-2 border-brand ${isIncoming ? 'animate-ping' : 'animate-pulse'}`} />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate text-[#EDEBE7]">{call.peerName}</p>
                    <p className="text-xs text-[#8B8D93] flex items-center gap-1">
                        {!isIncoming && <Loader2 size={11} className="animate-spin" />}
                        {isIncoming ? 'Chamada privada' : 'Chamando...'}
                    </p>
                    {isIncoming && willLeaveCurrentCall && (
                        <p className="text-[11px] text-amber-400/90 mt-0.5">Atender sai da chamada atual</p>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {isIncoming && (
                        <button
                            onClick={onAccept}
                            title="Atender"
                            className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <Phone size={16} />
                        </button>
                    )}
                    <button
                        onClick={onDecline}
                        title={isIncoming ? 'Recusar' : 'Cancelar'}
                        className="w-9 h-9 rounded-full bg-[#F2555A]/15 text-[#F2555A] hover:bg-[#F2555A]/25 flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <PhoneOff size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
