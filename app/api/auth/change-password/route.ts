import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { changePasswordSchema } from '@/lib/validation/auth';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = changePasswordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dados inválidos.' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { id: session.sub } });
        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        const validPassword = await bcrypt.compare(parsed.data.currentPassword, user.password);
        if (!validPassword) {
            return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });
        }

        const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: newPasswordHash },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        return NextResponse.json({ error: 'Erro interno ao alterar senha.' }, { status: 500 });
    }
}
