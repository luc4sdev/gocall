'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { registerSchema, type RegisterInput } from '@/lib/validation/auth';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Logo } from '@/components/Logo';

export function RegisterForm() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: { username: '', password: '', confirmPassword: '' },
    });

    const onSubmit = async (data: RegisterInput) => {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) {
                notify.error(result.error || 'Não foi possível cadastrar.');
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
                <CardTitle>Criar conta no GoCall</CardTitle>
                <CardDescription>Escolha um usuário e uma senha.</CardDescription>
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
                                            <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...field} />
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
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Repetir senha</FormLabel>
                                    <FormControl>
                                        <div className='relative'>
                                            <Input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" {...field} />
                                            {showConfirmPassword ? (
                                                <EyeOff className="size-4 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowConfirmPassword(false)} />
                                            ) : (
                                                <Eye className="size-4 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowConfirmPassword(true)} />
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={form.formState.isSubmitting} className="mt-2 cursor-pointer">
                            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                            Cadastrar
                        </Button>
                    </form>
                </Form>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                    Já tem uma conta?{' '}
                    <Link href="/login" className="text-foreground underline underline-offset-4">
                        Entrar
                    </Link>
                </p>
            </CardContent>
            </Card>
        </div>
    );
}
