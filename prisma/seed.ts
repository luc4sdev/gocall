import { prisma } from '@/lib/prisma';

async function main() {
    const server = await prisma.server.upsert({
        where: { id: 'server-oficial' },
        update: {},
        create: {
            id: 'server-oficial',
            name: 'Servidor Oficial',
        },
    });

    await prisma.channel.upsert({
        where: { serverId_name_type: { serverId: server.id, name: 'geral', type: 'TEXT' } },
        update: {},
        create: {
            name: 'geral',
            type: 'TEXT',
            serverId: server.id,
        },
    });

    await prisma.channel.upsert({
        where: { serverId_name_type: { serverId: server.id, name: 'Geral', type: 'VOICE' } },
        update: {},
        create: {
            name: 'Geral',
            type: 'VOICE',
            roomName: 'GoCall-Geral',
            serverId: server.id,
        },
    });

    console.log('Seed concluído.');
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
