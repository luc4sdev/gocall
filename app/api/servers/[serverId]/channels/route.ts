import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createChannelSchema } from '@/lib/validation/channel';
import { serverChannelsTag } from '@/lib/serverData';
import type { ChannelDTO } from '@/lib/types';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ serverId: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { serverId } = await params;

        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) {
            return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
        }

        const body = await request.json();
        const parsed = createChannelSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dados inválidos.' },
                { status: 400 }
            );
        }

        const { name, type } = parsed.data;

        const existing = await prisma.channel.findUnique({
            where: { serverId_name_type: { serverId, name, type } },
        });
        if (existing) {
            return NextResponse.json(
                { error: 'Já existe um canal com esse nome nessa categoria.' },
                { status: 409 }
            );
        }

        const channel = await prisma.channel.create({
            data: { name, type, serverId, createdById: session.sub },
        });

        const roomName = type === 'VOICE' ? `voice-${channel.id}` : null;
        if (roomName) {
            await prisma.channel.update({ where: { id: channel.id }, data: { roomName } });
        }

        const dto: ChannelDTO = {
            id: channel.id,
            name: channel.name,
            type: channel.type,
            roomName,
            canDelete: true,
            serverId,
        };

        revalidateTag(serverChannelsTag(serverId), 'max');

        return NextResponse.json({ channel: dto });
    } catch (error) {
        console.error('Erro ao criar canal:', error);
        return NextResponse.json({ error: 'Erro interno ao criar canal.' }, { status: 500 });
    }
}
