'use client';

import { useCallback } from 'react';
import { Hash, Volume2 } from 'lucide-react';
import { useChat } from '@livekit/components-react';
import { useAppContext } from '@/components/AppContext';
import { ChatChannel } from '@/components/chat/ChatChanel';
import { VoiceChannelGate } from '@/components/call/VoiceChannelGate';
import type { ChannelDTO } from '@/lib/types';

function ChannelHeader({ channel }: { channel: ChannelDTO }) {
    return (
        <div className="h-14 px-3 sm:px-5 flex items-center min-w-0 border-b border-white/4 bg-[#16171A] shrink-0 z-10">
            {channel.type === 'TEXT' ? (
                <Hash size={20} className="text-[#63656B] mr-2 shrink-0" />
            ) : (
                <Volume2 size={20} className="text-[#63656B] mr-2 shrink-0" />
            )}
            <span className="font-display font-semibold text-[15px] truncate min-w-0">{channel.name}</span>
        </div>
    );
}

function VoiceRoomSlot({ channelId }: { channelId: string }) {
    const { registerVoiceRoomSlot } = useAppContext();
    const refCallback = useCallback(
        (el: HTMLDivElement | null) => registerVoiceRoomSlot(channelId, el),
        [channelId, registerVoiceRoomSlot]
    );
    return <div ref={refCallback} className="flex-1 flex flex-col min-h-0" />;
}

export function ChannelView({ channel }: { channel: ChannelDTO }) {
    const { voiceChannel, theaterMode, onJoinVoice, setSkipAutoPauseOnJoin } = useAppContext();
    const { chatMessages, send } = useChat();

    if (channel.type === 'TEXT') {
        return (
            <>
                <ChannelHeader channel={channel} />
                <ChatChannel
                    key={channel.id}
                    channelId={channel.id}
                    chatMessages={chatMessages}
                    sendMessage={send}
                />
            </>
        );
    }

    const isViewingOwnCall = voiceChannel?.id === channel.id;

    if (!isViewingOwnCall) {
        return (
            <>
                <ChannelHeader channel={channel} />
                <VoiceChannelGate
                    key={channel.id}
                    channelName={channel.name}
                    onJoin={() => {
                        setSkipAutoPauseOnJoin(false);
                        return onJoinVoice(channel);
                    }}
                />
            </>
        );
    }

    return (
        <>
            {!theaterMode && <ChannelHeader channel={channel} />}
            <VoiceRoomSlot channelId={channel.id} />
        </>
    );
}
