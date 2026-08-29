import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getDmFriend } from '@/lib/friendship';
import { DirectMessageScreen } from '@/components/friends/DirectMessageScreen';

export default async function DirectMessagePage({
    params,
}: {
    params: Promise<{ friendId: string }>;
}) {
    const { friendId } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session) {
        notFound();
    }

    const friend = await getDmFriend(session.sub, friendId);
    if (!friend) {
        notFound();
    }

    return <DirectMessageScreen friend={friend} />;
}
