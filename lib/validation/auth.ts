import { z } from 'zod';

export const usernameSchema = z
    .string()
    .trim()
    .min(3, 'Mínimo de 3 caracteres')
    .max(24, 'Máximo de 24 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Use apenas letras, números e _');

export const passwordSchema = z
    .string()
    .min(6, 'Mínimo de 6 caracteres')
    .max(72, 'Máximo de 72 caracteres');

export const loginSchema = z.object({
    username: z.string().trim().min(1, 'Informe o usuário'),
    password: z.string().min(1, 'Informe a senha'),
});

export const registerSchema = z
    .object({
        username: usernameSchema,
        password: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'As senhas não coincidem',
        path: ['confirmPassword'],
    });

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Informe a senha atual'),
        newPassword: passwordSchema,
        confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: 'As senhas não coincidem',
        path: ['confirmNewPassword'],
    });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
