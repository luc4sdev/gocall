'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut, Loader2, Mic, Palette, UserRound } from 'lucide-react';

import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation/auth';
import { notify } from '@/lib/toast';
import {
    DEFAULT_ACCENT_COLOR,
    cn,
    getAccentColorPreference,
    getAdvancedNoiseSuppressionPreference,
    getAudioInputDevicePreference,
    getAudioOutputDevicePreference,
    getMicGainPreference,
    getNoiseSuppressionPreference,
    normalizeHexColor,
    setAccentColorPreference,
    setAdvancedNoiseSuppressionPreference,
    setAudioInputDevicePreference,
    setAudioOutputDevicePreference,
    setMicGainPreference,
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
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    username: string;
}

const TABS = [
    { id: 'audio', label: 'Áudio', icon: Mic },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'account', label: 'Conta', icon: UserRound },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function SettingsModal({ open, onOpenChange, username }: SettingsModalProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>('audio');
    const [loggingOut, setLoggingOut] = useState(false);
    const [noiseSuppression, setNoiseSuppression] = useState(getNoiseSuppressionPreference);
    const [advancedNoiseSuppression, setAdvancedNoiseSuppression] = useState(getAdvancedNoiseSuppressionPreference);
    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioInputId, setAudioInputId] = useState(getAudioInputDevicePreference);
    const [audioOutputId, setAudioOutputId] = useState(getAudioOutputDevicePreference);
    const [micGain, setMicGain] = useState(getMicGainPreference);
    const [accentColor, setAccentColor] = useState(getAccentColorPreference);
    const [accentHexInput, setAccentHexInput] = useState(getAccentColorPreference);
    const [accentError, setAccentError] = useState(false);

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

    const handleMicGainChange = (value: number) => {
        setMicGain(value);
        setMicGainPreference(value);
    };

    const accentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
        };
    }, []);

    const applyAccentColor = (hex: string) => {
        const normalized = normalizeHexColor(hex);
        if (!normalized) {
            setAccentError(true);
            return;
        }
        setAccentError(false);
        setAccentColor(normalized);
        setAccentHexInput(normalized);

        if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
        accentDebounceRef.current = setTimeout(() => setAccentColorPreference(normalized), 80);
    };

    const handleAccentPickerChange = (value: string) => applyAccentColor(value);

    const handleAccentHexChange = (value: string) => {
        setAccentHexInput(value);
        const normalized = normalizeHexColor(value);
        if (normalized) {
            setAccentError(false);
            setAccentColor(normalized);
            if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
            accentDebounceRef.current = setTimeout(() => setAccentColorPreference(normalized), 80);
        } else {
            setAccentError(value.trim().length >= 7);
        }
    };

    const handleResetAccentColor = () => applyAccentColor(DEFAULT_ACCENT_COLOR);

    const form = useForm<ChangePasswordInput>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
    });

    const onSubmit = async (data: ChangePasswordInput) => {
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) {
                notify.error(result.error || 'Não foi possível alterar a senha.');
                return;
            }
            notify.success('Senha alterada com sucesso.');
            form.reset();
        } catch {
            notify.error('Falha na conexão com o servidor.');
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
                if (!next) form.reset();
            }}
        >
            <DialogContent className="flex h-[min(640px,85dvh)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
                <DialogHeader className="shrink-0 border-b border-white/6 p-4 pb-3">
                    <DialogTitle>Configurações</DialogTitle>
                    <DialogDescription>Logado como {username}</DialogDescription>
                </DialogHeader>

                <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                    <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/6 p-2 sm:w-40 sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:border-r sm:border-b-0 sm:p-3">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                                        isActive
                                            ? 'bg-brand/12 text-brand'
                                            : 'text-[#8B8D93] hover:bg-white/5 hover:text-[#EDEBE7]'
                                    )}
                                >
                                    <Icon size={16} className="shrink-0" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                        {activeTab === 'audio' && (
                            <>
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
                                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${!advancedNoiseSuppression && noiseSuppression ? 'bg-brand' : 'bg-white/15'
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
                                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${advancedNoiseSuppression ? 'bg-brand' : 'bg-white/15'
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

                                <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">Volume do microfone</p>
                                            <p className="text-xs text-muted-foreground">Aumenta ou diminui o volume do seu áudio antes de enviar.</p>
                                        </div>
                                        <span className="shrink-0 text-xs font-medium text-[#8B8D93] tabular-nums">{micGain}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={200}
                                        step={5}
                                        value={micGain}
                                        onChange={(e) => handleMicGainChange(Number(e.target.value))}
                                        className="w-full accent-brand cursor-pointer"
                                    />
                                </div>
                            </>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-white/6 bg-white/2 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">Cor de destaque</p>
                                    <p className="text-xs text-muted-foreground">Muda a cor usada nos botões, ícones e destaques do app.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 cursor-pointer">
                                        <input
                                            type="color"
                                            value={accentColor}
                                            onChange={(e) => handleAccentPickerChange(e.target.value)}
                                            className="absolute -top-1 -left-1 h-11 w-11 cursor-pointer border-none bg-transparent p-0"
                                        />
                                    </label>
                                    <Input
                                        value={accentHexInput}
                                        onChange={(e) => handleAccentHexChange(e.target.value)}
                                        placeholder={DEFAULT_ACCENT_COLOR}
                                        maxLength={7}
                                        className="dark:bg-transparent"
                                    />
                                    <Button type="button" variant="outline" onClick={handleResetAccentColor} className="shrink-0">
                                        Padrão
                                    </Button>
                                </div>
                                {accentError && (
                                    <p className="text-xs text-destructive">Use um hex válido, tipo #FF6B4A.</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'account' && (
                            <>
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

                                        <Button type="submit" disabled={form.formState.isSubmitting}>
                                            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                                            Salvar nova senha
                                        </Button>
                                    </form>
                                </Form>

                                <Button
                                    variant="outline"
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="w-full text-destructive hover:text-destructive"
                                >
                                    {loggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
                                    Sair da conta
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
