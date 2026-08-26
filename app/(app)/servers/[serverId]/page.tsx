import { redirect, notFound } from 'next/navigation';
import { getCachedServerWithChannels } from '@/lib/serverData';

export default async function ServerPage({ params }: { params: Promise<{ serverId: string }> }) {
    const { serverId } = await params;

    const server = await getCachedServerWithChannels(serverId);

    if (!server) {
        notFound();
    }

    const firstChannel = server.channels.find((c) => c.type === 'TEXT') ?? server.channels[0];

    if (!firstChannel) {
        return (
            <div className="flex-1 flex items-center justify-center text-center px-4">
                <p className="text-sm text-[#8B8D93]">Esse servidor ainda não tem nenhum canal.</p>
            </div>
        );
    }

    redirect(`/servers/${serverId}/channels/${firstChannel.id}`);
}
