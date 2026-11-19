interface IluTwinMarkProps {
  className?: string;
}

export function IluTwinMark({ className = 'h-8 w-8' }: IluTwinMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="64" height="64" rx="16" fill="#111312" />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="15.25"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />
      <path
        d="M16 50V17L47 12V21"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="3.75"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      <polygon points="39,22 51,28 39,35 28,29" fill="#10B954" />
      <polygon points="26,35 39,42 52,34 52,46 39,54 26,47" fill="#FFFFFF" />
      <path
        d="M26 35L39 42L52 34M39 42V54"
        fill="none"
        stroke="#111312"
        strokeWidth="2.4"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
