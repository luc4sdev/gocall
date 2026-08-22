import { z } from 'zod';

export const createMessageSchema = z.object({
    content: z.string().trim().min(1, 'Mensagem vazia').max(2000, 'Mensagem muito longa'),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
