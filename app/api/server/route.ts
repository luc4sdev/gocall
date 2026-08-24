import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import type { ServerDTO } from '@/lib/types';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const server = await prisma.server.findFirst({
            orderBy: { createdAt: 'asc' },
            include: {
                channels: { orderBy: { createdAt: 'asc' } },
            },
        });

        if (!server) {
            return NextResponse.json(
                { error: 'Nenhum servidor cadastrado. Rode "pnpm db:seed".' },
                { status: 404 }
            );
        }

        const dto: ServerDTO = {
            id: server.id,
            name: server.name,
            channels: server.channels.map((c) => ({
                id: c.id,
                name: c.name,
                type: c.type,
                roomName: c.roomName,
                canDelete: c.createdById === session.sub,
            })),
        };

        return NextResponse.json({ server: dto });
    } catch (error) {
        console.error('Erro ao buscar servidor:', error);
        return NextResponse.json({ error: 'Erro interno ao buscar servidor' }, { status: 500 });
    }
}
