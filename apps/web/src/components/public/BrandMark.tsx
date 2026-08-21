type Props = {
  size?: number;
  className?: string;
};

/** Geometric roof + courtyard — NNHN mark, not a generic house emoji. */
export function BrandMark({ size = 28, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
    >
      <path d="M4 16.5 16 6l12 10.5" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M8 16.2V26h16V16.2" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <rect x="13.2" y="19.4" width="5.6" height="6.6" rx="0.6" fill="currentColor" />
      <circle cx="16" cy="12.2" r="1.15" fill="currentColor" />
    </svg>
  );
}
