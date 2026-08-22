import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const room = searchParams.get('room');
        const username = searchParams.get('username');

        if (!room || !username) {
            return NextResponse.json(
                { error: 'Os parâmetros "room" e "username" são obrigatórios.' },
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
            identity: username,
            name: username,
        });

        at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true });

        const token = await at.toJwt();
        return NextResponse.json({ token });

    } catch (error) {
        console.error("Erro ao gerar token:", error);
        return NextResponse.json({ error: 'Erro interno ao gerar token' }, { status: 500 });
    }
}