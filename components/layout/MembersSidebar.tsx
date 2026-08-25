import { Radio } from 'lucide-react';
import { Participant } from 'livekit-client';
import type { ChannelDTO } from '@/lib/types';

interface MembersSidebarProps {
    participants: Participant[];
    localIdentity: string;
    channels: ChannelDTO[];
}

interface Member {
    identity: string;
    name: string;
    isLocal: boolean;
    inCall: boolean;
    voiceChannelId: string | null;
    screenSharing: boolean;
}

function LiveBadge() {
    return (
        <span className="flex items-center gap-1 shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#F2555A] bg-[#F2555A]/10 px-1.5 py-0.5 rounded">
            <Radio size={10} />
            Ao vivo
        </span>
    );
}

function MemberRow({ member }: { member: Member }) {
    return (
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/3 cursor-pointer min-w-0">
            <div className="relative shrink-0">
                <div
                    className='w-8 h-8 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium overflow-hidden transition-shadow'
                >
                    {member.name[0]?.toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#16171A]" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[13px] text-[#B4B6BB] truncate">
                    {member.name}
                    {member.isLocal && ' (você)'}
                </span>
                {member.screenSharing && <LiveBadge />}
            </div>
        </div>
    );
}

export function MembersSidebar({ participants, localIdentity, channels }: MembersSidebarProps) {
    const members: Member[] = participants.map((p) => ({
        identity: p.identity,
        name: p.name || p.identity,
        isLocal: p.identity === localIdentity,
        inCall: p.attributes?.inCall === 'true',
        voiceChannelId: p.attributes?.voiceChannelId || null,
        screenSharing: p.attributes?.screenSharing === 'true',
    }));

    const inCallMembers = members.filter((m) => m.inCall);
    const onlineMembers = members.filter((m) => !m.inCall);

    const callGroups = new Map<string, Member[]>();
    for (const m of inCallMembers) {
        const key = m.voiceChannelId ?? '';
        const group = callGroups.get(key);
        if (group) group.push(m);
        else callGroups.set(key, [m]);
    }

    return (
        <div className="w-60 bg-[#16171A] flex flex-col shrink-0 border-l border-white/4">
            <div className="h-14 px-4 flex items-center shrink-0 border-b border-white/4">
                <span className="font-display font-semibold text-[13px] text-[#8B8D93] uppercase tracking-wider">
                    Membros — {members.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-4">
                {callGroups.size > 0 && (
                    <div className="mb-5">
                        <div className="mb-2 px-3 text-[11px] font-medium text-[#8B8D93] uppercase tracking-wider">
                            Em chamada — {inCallMembers.length}
                        </div>
                        {Array.from(callGroups.entries()).map(([channelId, groupMembers]) => {
                            const channelName = channels.find((c) => c.id === channelId)?.name ?? 'Chamada';
                            return (
                                <div key={channelId || 'unknown'} className="mb-3 last:mb-0">
                                    <div className="mb-1 px-3 text-[11px] font-medium text-[#63656B]">
                                        {channelName}
                                    </div>
                                    {groupMembers.sort((a, b) => Number(b.screenSharing) - Number(a.screenSharing)).map((m) => (
                                        <MemberRow key={m.identity} member={m} />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}

                {onlineMembers.length > 0 && (
                    <>
                        <div className="mt-1 mb-2 px-3 text-[11px] font-medium text-[#8B8D93] uppercase tracking-wider">
                            Online — {onlineMembers.length}
                        </div>
                        {onlineMembers.map((m) => (
                            <MemberRow key={m.identity} member={m} />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
