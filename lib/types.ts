export interface ChannelDTO {
    id: string;
    name: string;
    type: 'TEXT' | 'VOICE';
    roomName: string | null;
    canDelete: boolean;
    serverId: string;
}

export interface MessageDTO {
    id: string;
    content: string;
    createdAt: string;
    authorId: string;
    authorName: string;
}

export interface DirectMessageDTO {
    id: string;
    content: string;
    createdAt: string;
    authorId: string;
    authorName: string;
}

export type FriendshipStatus = 'PENDING' | 'ACCEPTED';

export interface FriendDTO {
    friendshipId: string;
    id: string;
    username: string;
    hasUnread: boolean;
}

export interface FriendRequestDTO {
    friendshipId: string;
    id: string;
    username: string;
    createdAt: string;
}

export interface UserSearchResultDTO {
    id: string;
    username: string;
    relationship: {
        status: FriendshipStatus;
        direction: 'incoming' | 'outgoing';
        friendshipId: string;
    } | null;
}
