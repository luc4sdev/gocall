import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getAcceptedFriendship } from '@/lib/friendship';
import { createMessageSchema } from '@/lib/validation/message';
import type { DirectMessageDTO } from '@/lib/types';

const HISTORY_LIMIT = 100;

async function requireSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return token ? await verifySession(token) : null;
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ friendId: string }> }
) {
    try {
        const session = await requireSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { friendId } = await params;
        if (friendId === session.sub) {
            return NextResponse.json({ error: 'Conversa inválida.' }, { status: 400 });
        }

        const friendship = await getAcceptedFriendship(session.sub, friendId);
        if (!friendship) {
            return NextResponse.json({ error: 'Vocês não são amigos.' }, { status: 403 });
        }

        const messages = await prisma.directMessage.findMany({
            where: {
                OR: [
                    { senderId: session.sub, recipientId: friendId },
                    { senderId: friendId, recipientId: session.sub },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: HISTORY_LIMIT,
            include: { sender: { select: { username: true } } },
        });
        messages.reverse();

        const dto: DirectMessageDTO[] = messages.map((m) => ({
            id: m.id,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
            authorId: m.senderId,
            authorName: m.sender.username,
        }));

        return NextResponse.json({ messages: dto });
    } catch (error) {
        console.error('Erro ao buscar mensagens diretas:', error);
        return NextResponse.json({ error: 'Erro interno ao buscar mensagens.' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ friendId: string }> }
) {
    try {
        const session = await requireSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { friendId } = await params;
        if (friendId === session.sub) {
            return NextResponse.json({ error: 'Conversa inválida.' }, { status: 400 });
        }

        const friendship = await getAcceptedFriendship(session.sub, friendId);
        if (!friendship) {
            return NextResponse.json({ error: 'Vocês não são amigos.' }, { status: 403 });
        }

        const body = await request.json();
        const parsed = createMessageSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dados inválidos.' },
                { status: 400 }
            );
        }

        const message = await prisma.directMessage.create({
            data: {
                content: parsed.data.content,
                senderId: session.sub,
                recipientId: friendId,
            },
            include: { sender: { select: { username: true } } },
        });

        const dto: DirectMessageDTO = {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            authorId: message.senderId,
            authorName: message.sender.username,
        };

        return NextResponse.json({ message: dto });
    } catch (error) {
        console.error('Erro ao enviar mensagem direta:', error);
        return NextResponse.json({ error: 'Erro interno ao enviar mensagem.' }, { status: 500 });
    }
}
