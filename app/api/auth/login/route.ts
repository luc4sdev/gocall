import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth';
import { loginSchema } from '@/lib/validation/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dados inválidos.' },
                { status: 400 }
            );
        }

        const { username, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
        }

        const token = await signSession({ sub: user.id, username: user.username });

        const response = NextResponse.json({ username: user.username });
        response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
        return response;
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return NextResponse.json({ error: 'Erro interno ao fazer login.' }, { status: 500 });
    }
}
