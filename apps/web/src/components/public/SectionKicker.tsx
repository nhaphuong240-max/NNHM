type Props = {
  children: string;
  className?: string;
};

export function SectionKicker({ children, className = '' }: Props) {
  return <p className={`nnhn-kicker ${className}`}>{children}</p>;
}
