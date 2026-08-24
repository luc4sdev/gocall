import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { roomHasParticipants } from '@/lib/livekit-admin';

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ channelId: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { channelId } = await params;

        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) {
            return NextResponse.json({ error: 'Canal não encontrado.' }, { status: 404 });
        }

        if (channel.createdById !== session.sub) {
            return NextResponse.json(
                { error: 'Só quem criou o canal pode apagá-lo.' },
                { status: 403 }
            );
        }

        if (channel.type === 'VOICE' && channel.roomName) {
            const inUse = await roomHasParticipants(channel.roomName);
            if (inUse) {
                return NextResponse.json(
                    { error: 'Não é possível apagar: ainda tem gente conectada nesse canal.' },
                    { status: 409 }
                );
            }
        }

        await prisma.channel.delete({ where: { id: channelId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao apagar canal:', error);
        return NextResponse.json({ error: 'Erro interno ao apagar canal.' }, { status: 500 });
    }
}
