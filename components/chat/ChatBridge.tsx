import type { useChat } from '@livekit/components-react';

export type ChatMessages = ReturnType<typeof useChat>['chatMessages'];
export type ChatSendFn = ReturnType<typeof useChat>['send'];

export interface ChatBridgeState {
    chatMessages: ChatMessages;
    send: ChatSendFn;
}
