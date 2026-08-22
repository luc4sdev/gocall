import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth';
import { registerSchema } from '@/lib/validation/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dados inválidos.' },
                { status: 400 }
            );
        }

        const { username, password } = parsed.data;

        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return NextResponse.json({ error: 'Esse nome de usuário já está em uso.' }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, password: passwordHash },
        });

        const token = await signSession({ sub: user.id, username: user.username });

        const response = NextResponse.json({ username: user.username });
        response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
        return response;
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        return NextResponse.json({ error: 'Erro interno ao cadastrar usuário.' }, { status: 500 });
    }
}
