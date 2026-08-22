export interface ChannelDTO {
    id: string;
    name: string;
    type: 'TEXT' | 'VOICE';
    roomName: string | null;
}

export interface ServerDTO {
    id: string;
    name: string;
    channels: ChannelDTO[];
}

export interface MessageDTO {
    id: string;
    content: string;
    createdAt: string;
    authorId: string;
    authorName: string;
}
