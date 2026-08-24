'use client';

import { useEffect } from 'react';
import { useChat } from '@livekit/components-react';

export type ChatMessages = ReturnType<typeof useChat>['chatMessages'];
export type ChatSendFn = ReturnType<typeof useChat>['send'];

export interface ChatBridgeState {
    chatMessages: ChatMessages;
    send: ChatSendFn;
}


export function ChatBridge({ onChange }: { onChange: (state: ChatBridgeState) => void }) {
    const { chatMessages, send } = useChat();

    useEffect(() => {
        onChange({ chatMessages, send });
    }, [chatMessages, send, onChange]);

    return null;
}
