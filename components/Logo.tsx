interface LogoProps {
    className?: string;
    color?: string;
}

export function Logo({ className, color = '#FF6B4A' }: LogoProps) {
    return (
        <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle
                cx="48"
                cy="48"
                r="27"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="127 43"
                strokeDashoffset="-14"
                transform="rotate(-90 48 48)"
            />
            <rect x="48" y="43" width="19" height="10" rx="3" fill={color} />
        </svg>
    );
}
