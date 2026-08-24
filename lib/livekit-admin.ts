import { RoomServiceClient } from 'livekit-server-sdk';

let cachedClient: RoomServiceClient | null = null;

function getRoomServiceClient(): RoomServiceClient | null {
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) return null;

    if (!cachedClient) {
        const host = url.replace(/^ws/, 'http');
        cachedClient = new RoomServiceClient(host, apiKey, apiSecret);
    }
    return cachedClient;
}

export async function roomHasParticipants(roomName: string): Promise<boolean> {
    const client = getRoomServiceClient();
    if (!client) return false;

    try {
        const participants = await client.listParticipants(roomName);
        return participants.length > 0;
    } catch (err) {
        console.error('Erro ao consultar participantes da sala no LiveKit:', err);
        return true;
    }
}
