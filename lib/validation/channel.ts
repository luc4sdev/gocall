import { z } from 'zod';

export const createChannelSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Nome obrigatório')
        .max(50, 'Nome muito longo')
        .regex(/^[^\s].*[^\s]$|^[^\s]$/, 'Nome não pode começar/terminar com espaço'),
    type: z.enum(['TEXT', 'VOICE']),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
