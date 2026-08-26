import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function PATCH(
    _request: Request,
    { params }: { params: Promise<{ friendshipId: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { friendshipId } = await params;
        const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
        if (!friendship) {
            return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
        }
        if (friendship.addresseeId !== session.sub) {
            return NextResponse.json(
                { error: 'Só quem recebeu o pedido pode aceitá-lo.' },
                { status: 403 }
            );
        }
        if (friendship.status === 'ACCEPTED') {
            return NextResponse.json({ error: 'Pedido já foi aceito.' }, { status: 409 });
        }

        const updated = await prisma.friendship.update({
            where: { id: friendshipId },
            data: { status: 'ACCEPTED' },
        });

        return NextResponse.json({ friendship: updated });
    } catch (error) {
        console.error('Erro ao aceitar pedido de amizade:', error);
        return NextResponse.json({ error: 'Erro interno ao aceitar pedido.' }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ friendshipId: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { friendshipId } = await params;
        const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
        if (!friendship) {
            return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
        }
        if (friendship.requesterId !== session.sub && friendship.addresseeId !== session.sub) {
            return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }

        await prisma.friendship.delete({ where: { id: friendshipId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao remover amizade:', error);
        return NextResponse.json({ error: 'Erro interno ao remover.' }, { status: 500 });
    }
}
