import { prisma } from '@/lib/prisma';

export function getAcceptedFriendship(userIdA: string, userIdB: string) {
    return prisma.friendship.findFirst({
        where: {
            status: 'ACCEPTED',
            OR: [
                { requesterId: userIdA, addresseeId: userIdB },
                { requesterId: userIdB, addresseeId: userIdA },
            ],
        },
    });
}


export async function getDmFriend(
    userId: string,
    friendId: string
): Promise<{ id: string; username: string } | null> {
    if (friendId === userId) return null;

    const friendship = await getAcceptedFriendship(userId, friendId);
    if (!friendship) return null;

    return prisma.user.findUnique({
        where: { id: friendId },
        select: { id: true, username: true },
    });
}
