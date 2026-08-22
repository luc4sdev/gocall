import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createMessageSchema } from '@/lib/validation/message';
import type { MessageDTO } from '@/lib/types';

const HISTORY_LIMIT = 100;

async function requireSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return token ? await verifySession(token) : null;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ channelId: string }> }
) {
    try {
        const session = await requireSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { channelId } = await params;

        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel || channel.type !== 'TEXT') {
            return NextResponse.json({ error: 'Canal de texto não encontrado.' }, { status: 404 });
        }

        const messages = await prisma.message.findMany({
            where: { channelId },
            orderBy: { createdAt: 'asc' },
            take: HISTORY_LIMIT,
            include: { author: { select: { username: true } } },
        });

        const dto: MessageDTO[] = messages.map((m) => ({
            id: m.id,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
            authorId: m.authorId,
            authorName: m.author.username,
        }));

        return NextResponse.json({ messages: dto });
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        return NextResponse.json({ error: 'Erro interno ao buscar mensagens.' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ channelId: string }> }
) {
    try {
        const session = await requireSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { channelId } = await params;

        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel || channel.type !== 'TEXT') {
            return NextResponse.json({ error: 'Canal de texto não encontrado.' }, { status: 404 });
        }

        const body = await request.json();
        const parsed = createMessageSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dados inválidos.' },
                { status: 400 }
            );
        }

        const message = await prisma.message.create({
            data: {
                content: parsed.data.content,
                channelId,
                authorId: session.sub,
            },
            include: { author: { select: { username: true } } },
        });

        const dto: MessageDTO = {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            authorId: message.authorId,
            authorName: message.author.username,
        };

        return NextResponse.json({ message: dto });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return NextResponse.json({ error: 'Erro interno ao enviar mensagem.' }, { status: 500 });
    }
}
