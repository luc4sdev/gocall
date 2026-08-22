'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useChat, useLocalParticipant } from '@livekit/components-react';
import { Send, Loader2 } from 'lucide-react';
import type { MessageDTO } from '@/lib/types';

interface ChatChannelProps {
    channelId: string;
}

interface DisplayMessage {
    key: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: number;
}

export function ChatChannel({ channelId }: ChatChannelProps) {
    const { localParticipant } = useLocalParticipant();
    const chatOptions = useMemo(() => ({ channelTopic: channelId }), [channelId]);
    const { send, chatMessages, isSending } = useChat(chatOptions);
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState<MessageDTO[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const loadHistory = async () => {
            try {
                const res = await fetch(`/api/channels/${channelId}/messages`);
                const data = await res.json();
                if (!cancelled && res.ok) setHistory(data.messages);
            } catch (err) {
                console.error('Erro ao carregar histórico do chat:', err);
            } finally {
                if (!cancelled) setIsLoadingHistory(false);
            }
        };
        loadHistory();

        return () => {
            cancelled = true;
        };
    }, [channelId]);

    const messages: DisplayMessage[] = useMemo(() => {
        const fromHistory: DisplayMessage[] = history.map((m) => ({
            key: m.id,
            authorId: m.authorId,
            authorName: m.authorName,
            content: m.content,
            timestamp: new Date(m.createdAt).getTime(),
        }));
        const fromLive: DisplayMessage[] = chatMessages.map((m) => ({
            key: m.id,
            authorId: m.from?.identity ?? 'unknown',
            authorName: m.from?.name || m.from?.identity || '?',
            content: m.message,
            timestamp: m.timestamp,
        }));
        return [...fromHistory, ...fromLive];
    }, [history, chatMessages]);

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        const content = message.trim();
        if (!content) return;
        setMessage('');

        try {
            await send(content);
        } catch (err) {
            console.error('Erro ao enviar mensagem via LiveKit:', err);
        }

        try {
            const res = await fetch(`/api/channels/${channelId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            if (!res.ok) {
                const data = await res.json();
                console.error('Erro ao salvar mensagem:', data.error);
            }
        } catch (err) {
            console.error('Erro ao salvar mensagem:', err);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-[#313338] p-4 min-h-0">

            <div className="flex-1 overflow-y-auto flex flex-col justify-end mb-4 pr-2 space-y-4">
                {isLoadingHistory ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-gray-400 text-center mb-4 flex flex-col items-center">
                        <div className="w-16 h-16 bg-[#4E5058] rounded-full flex items-center justify-center mb-4">
                            <span className="text-white text-3xl">#</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Bem-vindo</h2>
                        <p>Este é o começo do canal de texto.</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = msg.authorId === localParticipant.identity;
                        return (
                            <div
                                key={msg.key}
                                className={`flex items-start gap-4 p-2 rounded-md transition-colors border-l-2 ${isOwn
                                    ? 'bg-[#FF6B4A]/8 border-[#FF6B4A] hover:bg-[#FF6B4A]/12'
                                    : 'border-transparent hover:bg-[#2B2D31]'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-600 shrink-0 flex items-center justify-center overflow-hidden">
                                    <p>{(msg.authorName || '?')[0]?.toUpperCase()}</p>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className={`font-bold ${isOwn ? 'text-[#FF6B4A]' : 'text-gray-100'}`}>
                                            {isOwn ? 'Você' : msg.authorName}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 mt-1 text-[15px] wrap-break-word">{msg.content}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <form onSubmit={handleSend} className="bg-[#383A40] rounded-lg p-2 flex items-center gap-3 shrink-0">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Conversar"
                    className="bg-transparent border-none outline-none flex-1 text-gray-200 placeholder:text-gray-500"
                    disabled={isSending}
                />
                <button
                    type="submit"
                    disabled={!message.trim() || isSending}
                    className="p-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
