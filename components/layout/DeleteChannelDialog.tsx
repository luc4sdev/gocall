'use client';

import { useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import type { ChannelDTO } from '@/lib/types';
import { notify } from '@/lib/toast';

interface DeleteChannelDialogProps {
    channel: ChannelDTO | null;
    onOpenChange: (open: boolean) => void;
    onDeleted: (channelId: string) => void;
}

export function DeleteChannelDialog({ channel, onOpenChange, onDeleted }: DeleteChannelDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!channel) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/channels/${channel.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
                notify.error(data.error || 'Não foi possível apagar o canal.');
                return;
            }
            onDeleted(channel.id);
            onOpenChange(false);
        } catch {
            notify.error('Falha na conexão com o servidor.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={!!channel} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#16171A] ring-white/6 sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-[#EDEBE7] flex items-center gap-2">
                        <TriangleAlert size={18} className="text-[#F2555A]" />
                        Apagar canal
                    </DialogTitle>
                    <DialogDescription className="text-[#8B8D93]">
                        {channel?.type === 'TEXT'
                            ? <>Tem certeza que quer apagar <strong className="text-[#EDEBE7]">#{channel?.name}</strong>? Todas as mensagens desse canal serão apagadas permanentemente.</>
                            : <>Tem certeza que quer apagar <strong className="text-[#EDEBE7]">{channel?.name}</strong>? Essa ação não pode ser desfeita.</>}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2">
                    <button
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                        className="flex-1 bg-[#1F2023] hover:bg-[#26282c] text-[#EDEBE7] font-medium text-sm py-2.5 px-4 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 bg-[#F2555A] hover:bg-[#F2555A]/85 disabled:opacity-40 cursor-pointer text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {isDeleting && <Loader2 size={16} className="animate-spin" />}
                        Apagar
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
