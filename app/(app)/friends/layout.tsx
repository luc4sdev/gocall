import { FriendsShell } from '@/components/friends/FriendsShell';

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
    return <FriendsShell>{children}</FriendsShell>;
}
