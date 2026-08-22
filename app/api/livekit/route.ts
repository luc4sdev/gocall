import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifySession(token) : null;
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const room = searchParams.get('room');

        if (!room) {
            return NextResponse.json(
                { error: 'O parâmetro "room" é obrigatório.' },
                { status: 400 }
            );
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret) {
            return NextResponse.json(
                { error: 'Chaves do LiveKit não configuradas no .env' },
                { status: 500 }
            );
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: session.sub,
            name: session.username,
        });

        at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true, canUpdateOwnMetadata: true });

        const livekitToken = await at.toJwt();
        return NextResponse.json({ token: livekitToken });

    } catch (error) {
        console.error("Erro ao gerar token:", error);
        return NextResponse.json({ error: 'Erro interno ao gerar token' }, { status: 500 });
    }
}
