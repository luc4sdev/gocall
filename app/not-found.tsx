import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
    return (
        <div className="flex h-dvh flex-col items-center justify-center bg-[#0F1012] px-4 text-center">
            <Logo className="w-24 h-24 mb-6" />
            <h1 className="font-display font-semibold text-2xl text-[#EDEBE7] mb-2">
                Página não encontrada
            </h1>
            <p className="text-sm text-[#8B8D93] max-w-sm mb-8">
                Não encontramos o que você procurava. Talvez o link esteja errado ou a página não exista mais.
            </p>
            <Link
                href="/"
                className="bg-brand hover:bg-brand-hover text-[#0F1012] font-semibold text-sm py-2.5 px-5 rounded-xl transition-colors"
            >
                Voltar para o GoCall
            </Link>
        </div>
    );
}
