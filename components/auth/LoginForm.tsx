'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { loginSchema, type LoginInput } from '@/lib/validation/auth';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Logo } from '@/components/Logo';

export function LoginForm() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { username: '', password: '' },
    });

    const onSubmit = async (data: LoginInput) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) {
                notify.error(result.error || 'Não foi possível entrar.');
                return;
            }
            router.push('/');
            router.refresh();
        } catch {
            notify.error('Falha na conexão com o servidor.');
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#1F2023] flex items-center justify-center shrink-0">
                <Logo className="w-8 h-8" />
            </div>
            <Card className="w-full">
            <CardHeader>
                <CardTitle>Entrar no GoCall</CardTitle>
                <CardDescription>Informe seu usuário e senha para continuar.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Usuário</FormLabel>
                                    <FormControl>
                                        <Input placeholder="seu_usuario" autoComplete="username" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha</FormLabel>
                                    <FormControl>
                                        <div className='relative'>
                                            <Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" {...field} />
                                            {showPassword ? (
                                                <EyeOff className="size-4 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowPassword(false)} />
                                            ) : (
                                                <Eye className="size-4 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowPassword(true)} />
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={form.formState.isSubmitting} className="mt-2 cursor-pointer">
                            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                            Entrar
                        </Button>
                    </form>
                </Form>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                    Não tem uma conta?{' '}
                    <Link href="/register" className="text-foreground underline underline-offset-4">
                        Cadastre-se
                    </Link>
                </p>
            </CardContent>
            </Card>
        </div>
    );
}
