import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex-1 flex items-center justify-center bg-[#0F1012]">
            <Loader2 className="animate-spin text-[#63656B]" size={24} />
        </div>
    );
}
