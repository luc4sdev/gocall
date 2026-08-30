'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { MessageDTO } from '@/lib/types';
import type { ChatBridgeState } from './ChatBridge';

interface ChatChannelProps {
    channelId: string;
    chatMessages: ChatBridgeState['chatMessages'];
    sendMessage: ChatBridgeState['send'] | null;
}

interface DisplayMessage {
    key: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: number;
}

export function ChatChannel({ channelId, chatMessages, sendMessage }: ChatChannelProps) {
    const { localParticipant } = useLocalParticipant();
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState<MessageDTO[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const isNearBottomRef = useRef(true);

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

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const handleScroll = () => {
            isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        };
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const messages: DisplayMessage[] = useMemo(() => {
        const fromHistory: DisplayMessage[] = history.map((m) => ({
            key: m.id,
            authorId: m.authorId,
            authorName: m.authorName,
            content: m.content,
            timestamp: new Date(m.createdAt).getTime(),
        }));

        const fromLive: DisplayMessage[] = chatMessages
            .filter((m) => m.attributes?.channelId === channelId)
            .map((m) => ({
                key: m.id,
                authorId: m.from?.identity ?? 'unknown',
                authorName: m.from?.name || m.from?.identity || '?',
                content: m.message,
                timestamp: m.timestamp,
            }))
            .filter((live) => !fromHistory.some((h) =>
                h.authorId === live.authorId &&
                h.content === live.content &&
                Math.abs(h.timestamp - live.timestamp) < 10_000
            ));

        return [...fromHistory, ...fromLive];
    }, [history, chatMessages, channelId]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el || !isNearBottomRef.current) return;
        el.scrollTop = el.scrollHeight;
    }, [messages.length]);

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        const content = message.trim();
        if (!content || !sendMessage) return;
        setMessage('');

        setIsSending(true);
        try {
            await sendMessage(content, { attributes: { channelId } });
        } catch (err) {
            console.error('Erro ao enviar mensagem via LiveKit:', err);
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
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
        <div className="flex-1 flex flex-col bg-[#0B0C0D] px-2 sm:px-4 pt-2 sm:pt-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))] min-h-0">

            <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col mb-4 pr-1 sm:pr-2">
                {isLoadingHistory ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center">
                        <div className="w-16 h-16 bg-[#4E5058] rounded-full flex items-center justify-center mb-4">
                            <span className="text-white text-3xl">#</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Bem-vindo</h2>
                        <p>Este é o começo do canal de texto.</p>
                    </div>
                ) : (
                    // mt-auto (em vez de justify-end no container com overflow-y-auto) mantém as
                    // mensagens grudadas embaixo quando cabem todas, sem o bug clássico de
                    // flex-col + justify-end + overflow-auto que impede rolar até o início.
                    <div className="mt-auto flex flex-col space-y-3 sm:space-y-4">
                        {messages.map((msg) => {
                            const isOwn = msg.authorId === localParticipant.identity;
                            return (
                                <div
                                    key={msg.key}
                                    className={`flex items-start gap-2 sm:gap-4 p-2 rounded-md transition-colors border-l-2 ${isOwn
                                        ? 'bg-brand/8 border-brand hover:bg-brand/12'
                                        : 'border-transparent hover:bg-[#2B2D31]'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-600 shrink-0 flex items-center justify-center overflow-hidden">
                                        <p>{(msg.authorName || '?')[0]?.toUpperCase()}</p>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className={`font-bold ${isOwn ? 'text-brand' : 'text-gray-100'}`}>
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
                        })}
                    </div>
                )}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 rounded-xl border border-white/6 bg-[#1F2023] px-3 py-2 shrink-0">
                <Input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Conversar"
                    className="h-6 flex-1 border-none bg-transparent px-0 py-0 leading-6 text-[15px] text-[#EDEBE7] shadow-none placeholder:text-[#63656B] focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
                />
                <button
                    type="submit"
                    disabled={!message.trim() || isSending}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg cursor-pointer bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-white/5 disabled:text-[#63656B] disabled:cursor-not-allowed"
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
}
