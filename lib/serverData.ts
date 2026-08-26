import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

export function serverChannelsTag(serverId: string) {
    return `server-channels:${serverId}`;
}

export function getCachedServerWithChannels(serverId: string) {
    return unstable_cache(
        () =>
            prisma.server.findUnique({
                where: { id: serverId },
                include: { channels: { orderBy: { createdAt: 'asc' } } },
            }),
        ['server-with-channels', serverId],
        { tags: [serverChannelsTag(serverId)] }
    )();
}

export function getCachedChannel(channelId: string) {
    return unstable_cache(
        () => prisma.channel.findUnique({ where: { id: channelId } }),
        ['channel', channelId],
        { tags: [`channel:${channelId}`] }
    )();
}
