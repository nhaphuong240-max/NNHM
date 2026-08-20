import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'destructive' | 'default' | 'outline';
  className?: string;
  pulse?: boolean;
}

const variants = {
  success: 'bg-green-100 text-success border-green-200',
  warning: 'bg-orange-100 text-warning border-orange-200',
  destructive: 'bg-red-100 text-destructive border-red-200',
  default: 'bg-secondary text-primary border-border',
  outline: 'bg-card text-muted border-border',
};

export function Badge({ children, variant = 'default', className, pulse }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border',
        variants[variant],
        pulse && 'animate-pulse',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="success" className={className}>
      ✓ Verified Listing
    </Badge>
  );
}

export function HotLeadBadge({ score, className }: { score: number; className?: string }) {
  return (
    <Badge variant="warning" pulse className={className}>
      HOT {score}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
    AVAILABLE: 'success',
    RESERVED: 'warning',
    SOLD: 'destructive',
    ACTIVE: 'success',
    PENDING_SETUP: 'warning',
    PENDING_REVIEW: 'warning',
    PUBLISHED: 'success',
    REJECTED: 'destructive',
    PASS: 'success',
    FLAG: 'warning',
    BLOCK: 'destructive',
  };
  const labels: Record<string, string> = {
    AVAILABLE: 'Còn hàng',
    RESERVED: 'Đã giữ chỗ',
    SOLD: 'Đã bán',
    ACTIVE: 'Active',
    PENDING_SETUP: 'Pending',
    PENDING_REVIEW: 'Chờ duyệt',
    PUBLISHED: 'Published',
    REJECTED: 'Rejected',
    PASS: 'Anti-drift PASS',
    FLAG: 'DRIFT FLAG',
    BLOCK: 'BLOCKED',
  };
  return <Badge variant={map[status] ?? 'outline'}>{labels[status] ?? status}</Badge>;
}
