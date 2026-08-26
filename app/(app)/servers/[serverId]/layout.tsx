import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { ServerShell } from '@/components/layout/ServerShell';
import type { ChannelDTO } from '@/lib/types';

export default async function ServerLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ serverId: string }>;
}) {
    const { serverId } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session) {
        notFound();
    }

    const server = await prisma.server.findUnique({
        where: { id: serverId },
        include: { channels: { orderBy: { createdAt: 'asc' } } },
    });

    if (!server) {
        notFound();
    }

    const channels: ChannelDTO[] = server.channels.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        roomName: c.roomName,
        canDelete: c.createdById === session.sub,
        serverId: c.serverId,
    }));

    return (
        <ServerShell key={server.id} serverId={server.id} serverName={server.name} initialChannels={channels}>
            {children}
        </ServerShell>
    );
}
