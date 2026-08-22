import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

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

        return NextResponse.json({ server });
    } catch (error) {
        console.error('Erro ao buscar servidor:', error);
        return NextResponse.json({ error: 'Erro interno ao buscar servidor' }, { status: 500 });
    }
}
