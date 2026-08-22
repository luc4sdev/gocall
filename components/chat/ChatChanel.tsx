'use client';

import { FormEvent, useState } from 'react';
import { useChat } from '@livekit/components-react';
import { Send } from 'lucide-react';

export function ChatChannel() {
    const { send, chatMessages, isSending } = useChat();
    const [message, setMessage] = useState('');

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            await send(message);
            setMessage('');
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-[#313338] p-4 min-h-0">

            <div className="flex-1 overflow-y-auto flex flex-col justify-end mb-4 pr-2 space-y-4">
                {chatMessages.length === 0 ? (
                    <div className="text-gray-400 text-center mb-4 flex flex-col items-center">
                        <div className="w-16 h-16 bg-[#4E5058] rounded-full flex items-center justify-center mb-4">
                            <span className="text-white text-3xl">#</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Bem-vindo ao #geral</h2>
                        <p>Este é o começo do canal de texto.</p>
                    </div>
                ) : (
                    chatMessages.map((msg, idx) => (
                        <div key={idx} className="flex items-start gap-4 hover:bg-[#2B2D31] p-2 rounded-md transition-colors">
                            <div className="w-10 h-10 rounded-full bg-gray-600 shrink-0 flex items-center justify-center overflow-hidden">
                                <p>{(msg.from?.name || msg.from?.identity || '?')[0]?.toUpperCase()}</p>
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-gray-100">{msg.from?.name || msg.from?.identity}</span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-gray-300 mt-1 text-[15px] wrap-break-word">{msg.message}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSend} className="bg-[#383A40] rounded-lg p-2 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 bg-[#4E5058] rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#5865F2] transition-colors">
                    <span className="text-white font-bold text-lg leading-none -mt-0.5">+</span>
                </div>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Conversar em #geral"
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