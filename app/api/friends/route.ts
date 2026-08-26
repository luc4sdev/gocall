import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import type { FriendDTO, FriendRequestDTO } from '@/lib/types';

const sendRequestSchema = z.object({
    username: z.string().trim().min(1, 'Informe um nome de usuário.'),
});

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [{ requesterId: session.sub }, { addresseeId: session.sub }],
            },
            include: {
                requester: { select: { id: true, username: true } },
                addressee: { select: { id: true, username: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const friends: FriendDTO[] = [];
        const incomingRequests: FriendRequestDTO[] = [];
        const outgoingRequests: FriendRequestDTO[] = [];

        for (const f of friendships) {
            const isRequester = f.requesterId === session.sub;
            const other = isRequester ? f.addressee : f.requester;

            if (f.status === 'ACCEPTED') {
                friends.push({ friendshipId: f.id, id: other.id, username: other.username });
            } else if (isRequester) {
                outgoingRequests.push({
                    friendshipId: f.id,
                    id: other.id,
                    username: other.username,
                    createdAt: f.createdAt.toISOString(),
                });
            } else {
                incomingRequests.push({
                    friendshipId: f.id,
                    id: other.id,
                    username: other.username,
                    createdAt: f.createdAt.toISOString(),
                });
            }
        }

        return NextResponse.json({ friends, incomingRequests, outgoingRequests });
    } catch (error) {
        console.error('Erro ao listar amigos:', error);
        return NextResponse.json({ error: 'Erro interno ao listar amigos.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = sendRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dados inválidos.' },
                { status: 400 }
            );
        }

        const target = await prisma.user.findUnique({ where: { username: parsed.data.username } });
        if (!target) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        if (target.id === session.sub) {
            return NextResponse.json({ error: 'Você não pode adicionar a si mesmo.' }, { status: 400 });
        }

        const existing = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: session.sub, addresseeId: target.id },
                    { requesterId: target.id, addresseeId: session.sub },
                ],
            },
        });

        if (existing) {
            if (existing.status === 'ACCEPTED') {
                return NextResponse.json({ error: 'Vocês já são amigos.' }, { status: 409 });
            }
            if (existing.requesterId === session.sub) {
                return NextResponse.json({ error: 'Pedido já enviado.' }, { status: 409 });
            }

            const accepted = await prisma.friendship.update({
                where: { id: existing.id },
                data: { status: 'ACCEPTED' },
            });
            return NextResponse.json({ friendship: accepted, autoAccepted: true });
        }

        const friendship = await prisma.friendship.create({
            data: { requesterId: session.sub, addresseeId: target.id },
        });

        return NextResponse.json({ friendship });
    } catch (error) {
        console.error('Erro ao enviar pedido de amizade:', error);
        return NextResponse.json({ error: 'Erro interno ao enviar pedido.' }, { status: 500 });
    }
}
