import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { ChannelView } from '@/components/layout/ChannelView';
import type { ChannelDTO } from '@/lib/types';

export default async function ChannelPage({
    params,
}: {
    params: Promise<{ serverId: string; channelId: string }>;
}) {
    const { serverId, channelId } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session) {
        notFound();
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });

    if (!channel || channel.serverId !== serverId) {
        notFound();
    }

    const dto: ChannelDTO = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        roomName: channel.roomName,
        canDelete: channel.createdById === session.sub,
        serverId: channel.serverId,
    };

    return <ChannelView channel={dto} />;
}
