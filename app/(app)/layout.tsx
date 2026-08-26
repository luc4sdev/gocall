import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
        redirect('/login');
    }

    const server = await prisma.server.findFirst({ orderBy: { createdAt: 'asc' } });

    if (!server) {
        return (
            <div className="flex h-dvh bg-[#16171A] items-center justify-center flex-col text-gray-300 text-center px-4">
                <p className="text-[#F2555A] font-semibold mb-2">Nenhum servidor cadastrado</p>
            </div>
        );
    }

    return (
        <AppShell username={session.username} homeServerId={server.id} homeServerName={server.name}>
            {children}
        </AppShell>
    );
}
