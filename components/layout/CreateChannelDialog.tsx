'use client';

import { useState } from 'react';
import { Hash, Volume2, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import type { ChannelDTO } from '@/lib/types';

interface CreateChannelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: 'TEXT' | 'VOICE';
    serverId: string;
    onCreated: (channel: ChannelDTO) => void;
}

export function CreateChannelDialog({ open, onOpenChange, type, serverId, onCreated }: CreateChannelDialogProps) {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleClose = (next: boolean) => {
        onOpenChange(next);
        if (!next) {
            setName('');
            setError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        setError('');
        try {
            const res = await fetch(`/api/servers/${serverId}/channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), type }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Não foi possível criar o canal.');
                return;
            }
            onCreated(data.channel);
            handleClose(false);
        } catch {
            setError('Falha na conexão com o servidor.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const Icon = type === 'TEXT' ? Hash : Volume2;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-[#16171A] ring-white/6 sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-[#EDEBE7] flex items-center gap-2">
                        <Icon size={18} className="text-[#FF6B4A]" />
                        Criar canal de {type === 'TEXT' ? 'texto' : 'voz'}
                    </DialogTitle>
                    <DialogDescription className="text-[#8B8D93]">
                        Escolha um nome pro canal.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={50}
                        placeholder={type === 'TEXT' ? 'novo-canal' : 'Sala nova'}
                        className="w-full bg-[#0F1012] border border-white/8 rounded-lg px-3 py-2 text-sm text-[#EDEBE7] placeholder:text-[#63656B] outline-none focus:border-[#FF6B4A]/50 transition-colors"
                    />

                    {error && <p className="text-sm text-[#F2555A]">{error}</p>}

                    <button
                        type="submit"
                        disabled={!name.trim() || isSubmitting}
                        className="w-full bg-[#FF6B4A] hover:bg-[#FF7D5F] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-[#0F1012] font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                        Criar canal
                    </button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
