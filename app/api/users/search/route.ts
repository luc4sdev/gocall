import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import type { UserSearchResultDTO } from '@/lib/types';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q')?.trim() ?? '';
        if (q.length < 2) {
            return NextResponse.json({ users: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                username: { contains: q, mode: 'insensitive' },
                id: { not: session.sub },
            },
            take: 10,
            orderBy: { username: 'asc' },
            select: { id: true, username: true },
        });

        if (users.length === 0) {
            return NextResponse.json({ users: [] });
        }

        const userIds = users.map((u) => u.id);
        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [
                    { requesterId: session.sub, addresseeId: { in: userIds } },
                    { addresseeId: session.sub, requesterId: { in: userIds } },
                ],
            },
        });

        const relationshipByUserId = new Map<string, UserSearchResultDTO['relationship']>();
        for (const f of friendships) {
            const otherId = f.requesterId === session.sub ? f.addresseeId : f.requesterId;
            relationshipByUserId.set(otherId, {
                status: f.status,
                direction: f.requesterId === session.sub ? 'outgoing' : 'incoming',
                friendshipId: f.id,
            });
        }

        const result: UserSearchResultDTO[] = users.map((u) => ({
            id: u.id,
            username: u.username,
            relationship: relationshipByUserId.get(u.id) ?? null,
        }));

        return NextResponse.json({ users: result });
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return NextResponse.json({ error: 'Erro interno ao buscar usuários.' }, { status: 500 });
    }
}
