import { Participant } from 'livekit-client';
import { MicOff } from 'lucide-react';

interface MembersSidebarProps {
    participants: Participant[];
    localIdentity: string;
}

interface Member {
    identity: string;
    name: string;
    isLocal: boolean;
    inCall: boolean;
    isMicrophoneEnabled: boolean;
    isSpeaking: boolean;
}

function MemberRow({ member }: { member: Member }) {
    return (
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/3 cursor-pointer">
            <div className="relative shrink-0">
                <div
                    className='w-8 h-8 rounded-full bg-[#2A2D35] flex items-center justify-center text-[12px] font-medium overflow-hidden transition-shadow'
                >
                    {member.name[0]?.toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#16171A]" />
                {member.inCall && !member.isMicrophoneEnabled && (
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#16171A] rounded-full flex items-center justify-center">
                        <MicOff size={9} className="text-[#8B8D93]" />
                    </div>
                )}
            </div>
            <span className="text-[13px] text-[#B4B6BB] truncate">
                {member.name}
                {member.isLocal && ' (você)'}
            </span>
        </div>
    );
}

export function MembersSidebar({ participants, localIdentity }: MembersSidebarProps) {
    const members: Member[] = participants.map((p) => ({
        identity: p.identity,
        name: p.name || p.identity,
        isLocal: p.identity === localIdentity,
        inCall: p.attributes?.inCall === 'true',
        isMicrophoneEnabled: p.isMicrophoneEnabled,
        isSpeaking: p.isSpeaking,
    }));

    const inCallMembers = members.filter((m) => m.inCall);
    const onlineMembers = members.filter((m) => !m.inCall);

    return (
        <div className="w-60 bg-[#16171A] flex flex-col shrink-0 border-l border-white/4">
            <div className="h-14 px-4 flex items-center shrink-0 border-b border-white/4">
                <span className="font-display font-semibold text-[13px] text-[#8B8D93] uppercase tracking-wider">
                    Membros — {members.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-4">
                {inCallMembers.length > 0 && (
                    <>
                        <div className="mb-2 px-3 text-[11px] font-medium text-[#8B8D93] uppercase tracking-wider">
                            Em chamada — {inCallMembers.length}
                        </div>
                        {inCallMembers.map((m) => (
                            <MemberRow key={m.identity} member={m} />
                        ))}
                    </>
                )}

                {onlineMembers.length > 0 && (
                    <>
                        <div className="mt-5 mb-2 px-3 text-[11px] font-medium text-[#8B8D93] uppercase tracking-wider">
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
