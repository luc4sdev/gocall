import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
    var prismaGlobal: PrismaClient | undefined;
}

function resolveConnectionString(databaseUrl?: string) {
    if (!databaseUrl) return databaseUrl;
    try {
        const url = new URL(databaseUrl);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return databaseUrl;
        url.searchParams.set('sslmode', 'no-verify');
        return url.toString();
    } catch {
        return databaseUrl;
    }
}

const adapter = new PrismaPg({
    connectionString: resolveConnectionString(process.env.DATABASE_URL),
});

export const prisma = globalThis.prismaGlobal ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma;
}
