'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut, Loader2 } from 'lucide-react';

import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation/auth';
import {
    getAdvancedNoiseSuppressionPreference,
    getAudioInputDevicePreference,
    getAudioOutputDevicePreference,
    getNoiseSuppressionPreference,
    setAdvancedNoiseSuppressionPreference,
    setAudioInputDevicePreference,
    setAudioOutputDevicePreference,
    setNoiseSuppressionPreference,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    const [noiseSuppression, setNoiseSuppression] = useState(getNoiseSuppressionPreference);
    const [advancedNoiseSuppression, setAdvancedNoiseSuppression] = useState(getAdvancedNoiseSuppressionPreference);
    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioInputId, setAudioInputId] = useState(getAudioInputDevicePreference);
    const [audioOutputId, setAudioOutputId] = useState(getAudioOutputDevicePreference);

    const handleToggleNoiseSuppression = () => {
        const next = !noiseSuppression;
        setNoiseSuppression(next);
        setNoiseSuppressionPreference(next);
    };

    const handleToggleAdvancedNoiseSuppression = () => {
        const next = !advancedNoiseSuppression;
        setAdvancedNoiseSuppression(next);
        setAdvancedNoiseSuppressionPreference(next);
    };

    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        const loadDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                if (cancelled) return;
                setInputDevices(devices.filter((d) => d.kind === 'audioinput'));
                setOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
            } catch (err) {
                console.error('Erro ao listar dispositivos de áudio:', err);
            }
        };
        loadDevices();

        navigator.mediaDevices.addEventListener('devicechange', loadDevices);
        return () => {
            cancelled = true;
            navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
        };
    }, [open]);

    const handleAudioInputChange = (deviceId: string) => {
        setAudioInputId(deviceId);
        setAudioInputDevicePreference(deviceId);
    };

    const handleAudioOutputChange = (deviceId: string) => {
        setAudioOutputId(deviceId);
        setAudioOutputDevicePreference(deviceId);
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

    const inputItems = [
        { value: '', label: 'Padrão do sistema' },
        ...inputDevices.map((d, i) => ({ value: d.deviceId, label: d.label || `Microfone ${i + 1}` })),
    ];
    const outputItems = [
        { value: '', label: 'Padrão do sistema' },
        ...outputDevices.map((d, i) => ({ value: d.deviceId, label: d.label || `Saída ${i + 1}` })),
    ];

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
            <DialogContent className="max-h-[85dvh] 2xl:max-h-[105dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configurações</DialogTitle>
                    <DialogDescription>Logado como {username}</DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/2 px-3 py-2.5">
                    <div className="min-w-0">
                        <p className="text-sm font-medium">Supressão de ruído</p>
                        <p className="text-xs text-muted-foreground">
                            {advancedNoiseSuppression
                                ? 'Desativada automaticamente enquanto a avançada estiver ligada.'
                                : 'Reduz ruídos de fundo captados pelo seu microfone.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={!advancedNoiseSuppression && noiseSuppression}
                        disabled={advancedNoiseSuppression}
                        onClick={handleToggleNoiseSuppression}
                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${!advancedNoiseSuppression && noiseSuppression ? 'bg-[#FF6B4A]' : 'bg-white/15'
                            }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${!advancedNoiseSuppression && noiseSuppression ? 'translate-x-4' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/2 px-3 py-2.5">
                    <div className="min-w-0">
                        <p className="text-sm font-medium">Supressão de ruído avançada (experimental)</p>
                        <p className="text-xs text-muted-foreground">
                            Modelo de rede neural (RNNoise), substitui a supressão padrão quando ativada.
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={advancedNoiseSuppression}
                        onClick={handleToggleAdvancedNoiseSuppression}
                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${advancedNoiseSuppression ? 'bg-[#FF6B4A]' : 'bg-white/15'
                            }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${advancedNoiseSuppression ? 'translate-x-4' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>

                <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-white/6 bg-white/2 px-3 py-2.5">
                    <div className="flex min-w-0 flex-col gap-1.5">
                        <label className="text-sm font-medium">Microfone</label>
                        <Select items={inputItems} value={audioInputId} onValueChange={(value) => handleAudioInputChange(value as string)}>
                            <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder="Padrão do sistema" className="min-w-0" />
                            </SelectTrigger>
                            <SelectContent className="w-auto min-w-(--anchor-width) max-w-[min(90vw,24rem)] overflow-x-auto">
                                <SelectItem value="">Padrão do sistema</SelectItem>
                                {inputDevices.map((d, i) => (
                                    <SelectItem key={d.deviceId} value={d.deviceId}>
                                        {d.label || `Microfone ${i + 1}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex min-w-0 flex-col gap-1.5">
                        <label className="text-sm font-medium">Saída de áudio</label>
                        <Select items={outputItems} value={audioOutputId} onValueChange={(value) => handleAudioOutputChange(value as string)}>
                            <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder="Padrão do sistema" className="min-w-0" />
                            </SelectTrigger>
                            <SelectContent className="w-auto min-w-(--anchor-width) max-w-[min(90vw,24rem)] overflow-x-auto">
                                <SelectItem value="">Padrão do sistema</SelectItem>
                                {outputDevices.map((d, i) => (
                                    <SelectItem key={d.deviceId} value={d.deviceId}>
                                        {d.label || `Saída ${i + 1}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Aplicado na hora se você já estiver numa chamada, ou na próxima vez que entrar.
                    </p>
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
