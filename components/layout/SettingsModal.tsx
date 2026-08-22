'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut, Loader2 } from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';

import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation/auth';
import { getAudioCaptureOptions, getNoiseSuppressionPreference, setNoiseSuppressionPreference } from '@/lib/utils';
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
    const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
    const [serverError, setServerError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [noiseSuppression, setNoiseSuppression] = useState(getNoiseSuppressionPreference);

    const handleToggleNoiseSuppression = async () => {
        const next = !noiseSuppression;
        setNoiseSuppression(next);
        setNoiseSuppressionPreference(next);
        if (isMicrophoneEnabled) {
            try {
                await localParticipant.setMicrophoneEnabled(false);
                await localParticipant.setMicrophoneEnabled(true, getAudioCaptureOptions());
            } catch (err) {
                console.error('Não foi possível aplicar a supressão de ruído', err);
            }
        }
    };

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

                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/2 px-3 py-2.5">
                    <div className="min-w-0">
                        <p className="text-sm font-medium">Supressão de ruído</p>
                        <p className="text-xs text-muted-foreground">Reduz ruídos de fundo captados pelo seu microfone.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={noiseSuppression}
                        onClick={handleToggleNoiseSuppression}
                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${noiseSuppression ? 'bg-[#FF6B4A]' : 'bg-white/15'
                            }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${noiseSuppression ? 'translate-x-4' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>

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
