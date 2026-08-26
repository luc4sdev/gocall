'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Search, UserMinus, UserPlus, X } from 'lucide-react';
import { useAppContext } from '@/components/AppContext';
import { Logo } from '@/components/Logo';
import type { FriendDTO, FriendRequestDTO, UserSearchResultDTO } from '@/lib/types';

interface FriendsViewProps {
    friends: FriendDTO[];
    incomingRequests: FriendRequestDTO[];
    outgoingRequests: FriendRequestDTO[];
    onRefresh: () => Promise<void>;
}

export function FriendsView({ friends, incomingRequests, outgoingRequests, onRefresh }: FriendsViewProps) {
    const { activeParticipants } = useAppContext();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserSearchResultDTO[]>([]);
    const [searching, setSearching] = useState(false);
    const [actionError, setActionError] = useState('');
    const [pendingActionId, setPendingActionId] = useState<string | null>(null);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) return;
        let cancelled = false;
        const timeout = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`);
                const json = await res.json();
                if (!cancelled && res.ok) setResults(json.users ?? []);
            } catch {
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [query]);

    const onlineIds = new Set(activeParticipants.map((p) => p.identity));

    const sendRequest = async (username: string) => {
        setActionError('');
        setPendingActionId(username);
        try {
            const res = await fetch('/api/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            const json = await res.json();
            if (!res.ok) {
                setActionError(json.error || 'Não foi possível enviar o pedido.');
                return;
            }
            setQuery('');
            setResults([]);
            await onRefresh();
        } catch {
            setActionError('Falha na conexão com o servidor.');
        } finally {
            setPendingActionId(null);
        }
    };

    const acceptRequest = async (friendshipId: string) => {
        setActionError('');
        setPendingActionId(friendshipId);
        try {
            const res = await fetch(`/api/friends/${friendshipId}`, { method: 'PATCH' });
            const json = await res.json();
            if (!res.ok) {
                setActionError(json.error || 'Não foi possível aceitar o pedido.');
                return;
            }
            await onRefresh();
        } catch {
            setActionError('Falha na conexão com o servidor.');
        } finally {
            setPendingActionId(null);
        }
    };

    const removeFriendship = async (friendshipId: string) => {
        setActionError('');
        setPendingActionId(friendshipId);
        try {
            const res = await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' });
            if (!res.ok) {
                const json = await res.json();
                setActionError(json.error || 'Não foi possível concluir a ação.');
                return;
            }
            await onRefresh();
        } catch {
            setActionError('Falha na conexão com o servidor.');
        } finally {
            setPendingActionId(null);
        }
    };

    const incoming = incomingRequests;
    const outgoing = outgoingRequests;
    const onlineFriends = friends.filter((f) => onlineIds.has(f.id));

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0F1012]">
            <div className="h-14 px-5 flex items-center border-b border-white/4 shrink-0">
                <span className="font-display font-semibold text-[15px]">Amigos</span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="max-w-2xl mx-auto">
                    {actionError && (
                        <p className="mb-4 text-xs text-[#F2555A] bg-[#F2555A]/10 border border-[#F2555A]/20 rounded-lg px-3 py-2">
                            {actionError}
                        </p>
                    )}

                    <div className="mb-6">
                        <label className="text-xs font-medium text-[#8B8D93] uppercase tracking-wider mb-2 block">
                            Adicionar amigo
                        </label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#63656B]" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar por username"
                                className="w-full bg-[#1F2023] border border-white/8 rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#EDEBE7] placeholder:text-[#63656B] outline-none focus:border-brand/50 transition-colors"
                            />
                        </div>

                        {query.trim().length >= 2 && (
                            <div className="mt-2 rounded-lg border border-white/8 bg-[#1F2023] overflow-hidden">
                                {searching && results.length === 0 ? (
                                    <div className="px-3 py-2.5 text-sm text-[#8B8D93]">Buscando...</div>
                                ) : results.length === 0 ? (
                                    <div className="px-3 py-2.5 text-sm text-[#8B8D93]">Nenhum usuário encontrado.</div>
                                ) : (
                                    results.map((u) => (
                                        <div
                                            key={u.id}
                                            className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-white/4 last:border-b-0"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium shrink-0">
                                                    {u.username[0]?.toUpperCase()}
                                                </div>
                                                <span className="text-sm truncate">{u.username}</span>
                                            </div>
                                            {u.relationship?.status === 'ACCEPTED' ? (
                                                <span className="text-xs text-[#8B8D93] shrink-0">Já são amigos</span>
                                            ) : u.relationship?.status === 'PENDING' ? (
                                                <span className="text-xs text-[#8B8D93] shrink-0">
                                                    {u.relationship.direction === 'outgoing' ? 'Pedido enviado' : 'Te chamou'}
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => sendRequest(u.username)}
                                                    disabled={pendingActionId === u.username}
                                                    className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-brand hover:bg-brand-hover disabled:opacity-40 text-[#0F1012] rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                                                >
                                                    {pendingActionId === u.username ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <UserPlus size={12} />
                                                    )}
                                                    Adicionar
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {incoming.length > 0 && (
                        <div className="mb-6">
                            <p className="text-xs font-medium text-[#8B8D93] uppercase tracking-wider mb-2">
                                Pedidos recebidos — {incoming.length}
                            </p>
                            <div className="flex flex-col gap-1">
                                {incoming.map((r) => (
                                    <div
                                        key={r.friendshipId}
                                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-white/3"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-9 h-9 rounded-full bg-[#2A2D35] flex items-center justify-center text-[13px] font-medium shrink-0">
                                                {r.username[0]?.toUpperCase()}
                                            </div>
                                            <span className="text-sm truncate">{r.username}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => acceptRequest(r.friendshipId)}
                                                disabled={pendingActionId === r.friendshipId}
                                                title="Aceitar"
                                                className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                                            >
                                                <Check size={15} />
                                            </button>
                                            <button
                                                onClick={() => removeFriendship(r.friendshipId)}
                                                disabled={pendingActionId === r.friendshipId}
                                                title="Recusar"
                                                className="w-8 h-8 rounded-full bg-[#F2555A]/15 text-[#F2555A] hover:bg-[#F2555A]/25 flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {outgoing.length > 0 && (
                        <div className="mb-6">
                            <p className="text-xs font-medium text-[#8B8D93] uppercase tracking-wider mb-2">
                                Pedidos enviados — {outgoing.length}
                            </p>
                            <div className="flex flex-col gap-1">
                                {outgoing.map((r) => (
                                    <div
                                        key={r.friendshipId}
                                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-white/3"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-9 h-9 rounded-full bg-[#2A2D35] flex items-center justify-center text-[13px] font-medium shrink-0">
                                                {r.username[0]?.toUpperCase()}
                                            </div>
                                            <span className="text-sm truncate text-[#8B8D93]">{r.username}</span>
                                        </div>
                                        <button
                                            onClick={() => removeFriendship(r.friendshipId)}
                                            disabled={pendingActionId === r.friendshipId}
                                            className="shrink-0 text-xs text-[#8B8D93] hover:text-[#F2555A] transition-colors cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {onlineFriends.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-16">
                            <Logo className="w-20 h-20 mb-4 opacity-80" />
                            <p className="text-sm text-[#63656B]">Nenhum amigo online por enquanto.</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs font-medium text-[#8B8D93] uppercase tracking-wider mb-2">
                                Online — {onlineFriends.length}
                            </p>
                            <div className="flex flex-col gap-1">
                                {onlineFriends.map((f) => (
                                    <FriendRow
                                        key={f.friendshipId}
                                        friend={f}
                                        onRemove={() => removeFriendship(f.friendshipId)}
                                        pending={pendingActionId === f.friendshipId}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FriendRow({
    friend,
    onRemove,
    pending,
}: {
    friend: FriendDTO;
    onRemove: () => void;
    pending: boolean;
}) {
    return (
        <div className="group flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-white/3">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-[#2A2D35] flex items-center justify-center text-[13px] font-medium">
                        {friend.username[0]?.toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#0F1012] bg-emerald-500" />
                </div>
                <span className="text-sm truncate text-[#EDEBE7]">{friend.username}</span>
            </div>
            <button
                onClick={onRemove}
                disabled={pending}
                title="Desfazer amizade"
                className="shrink-0 p-1.5 rounded-lg text-[#63656B] opacity-0 group-hover:opacity-100 hover:bg-[#F2555A]/15 hover:text-[#F2555A] transition-all disabled:opacity-40 cursor-pointer"
            >
                <UserMinus size={14} />
            </button>
        </div>
    );
}
