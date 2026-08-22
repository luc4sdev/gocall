import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;

    if (session) {
        redirect('/');
    }

    return (
        <div className="flex h-screen items-center justify-center bg-[#0F1012] px-4">
            <LoginForm />
        </div>
    );
}
