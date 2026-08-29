import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getAcceptedFriendship } from '@/lib/friendship';

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ friendId: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { friendId } = await params;
        const friendship = await getAcceptedFriendship(session.sub, friendId);
        if (!friendship) {
            return NextResponse.json({ error: 'Vocês não são amigos.' }, { status: 403 });
        }

        const isRequester = friendship.requesterId === session.sub;
        await prisma.friendship.update({
            where: { id: friendship.id },
            data: isRequester
                ? { requesterLastReadAt: new Date() }
                : { addresseeLastReadAt: new Date() },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao marcar conversa como lida:', error);
        return NextResponse.json({ error: 'Erro interno ao marcar como lida.' }, { status: 500 });
    }
}
