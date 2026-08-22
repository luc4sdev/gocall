'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut, Loader2 } from 'lucide-react';

import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    username: string;
}

export function SettingsModal({ open, onOpenChange, username }: SettingsModalProps) {
    const router = useRouter();
    const [serverError, setServerError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const form = useForm<ChangePasswordInput>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
    });

    const onSubmit = async (data: ChangePasswordInput) => {
        setServerError('');
        setSuccess(false);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) {
                setServerError(result.error || 'Não foi possível alterar a senha.');
                return;
            }
            setSuccess(true);
            form.reset();
        } catch {
            setServerError('Falha na conexão com o servidor.');
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
            router.push('/login');
            router.refresh();
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next);
                if (!next) {
                    form.reset();
                    setServerError('');
                    setSuccess(false);
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Configurações</DialogTitle>
                    <DialogDescription>Logado como {username}</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                        <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha atual</FormLabel>
                                    <FormControl>
                                        <Input type="password" autoComplete="current-password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nova senha</FormLabel>
                                    <FormControl>
                                        <Input type="password" autoComplete="new-password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmNewPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Repetir nova senha</FormLabel>
                                    <FormControl>
                                        <Input type="password" autoComplete="new-password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
                        {success && <p className="text-sm text-emerald-500">Senha alterada com sucesso.</p>}

                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                            Salvar nova senha
                        </Button>
                    </form>
                </Form>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full text-destructive hover:text-destructive"
                    >
                        {loggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
                        Sair da conta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
