import { Link } from 'react-router-dom';
import { Building2, CheckCircle2 } from 'lucide-react';
import { Card, CardBody } from './ui/Card';
import { VerifiedBadge } from './ui/Badge';
import { formatPrice } from '../lib/utils';
import type { Unit } from '../data/mock';

interface UnitCardProps {
  unit: Unit;
  onCompare?: (id: string) => void;
  compareSelected?: boolean;
  linkTo?: string;
}

export function UnitCard({ unit, onCompare, compareSelected, linkTo }: UnitCardProps) {
  const content = (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative aspect-video bg-gradient-to-br from-secondary to-slate-200 flex items-center justify-center">
        <Building2 className="h-12 w-12 text-primary/30" />
        {unit.verified && (
          <div className="absolute top-2 right-2">
            <VerifiedBadge />
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <StatusDot status={unit.status} />
        </div>
      </div>
      <CardBody className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-lg">{unit.code}</h3>
            <p className="text-sm text-muted">
              {unit.block} · Tầng {unit.floor}
            </p>
          </div>
          {onCompare && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCompare(unit.id);
              }}
              className={`h-8 w-8 rounded border flex items-center justify-center text-sm ${
                compareSelected ? 'bg-primary text-white border-primary' : 'border-border hover:bg-secondary'
              }`}
              aria-label="So sánh"
            >
              {compareSelected ? <CheckCircle2 className="h-4 w-4" /> : '+'}
            </button>
          )}
        </div>
        <p className="text-sm text-muted">
          {unit.bedrooms}PN · {unit.area}m² · {unit.direction}
        </p>
        <p className="text-2xl font-bold tabular-nums text-primary">{formatPrice(unit.price)}</p>
        <p className="text-xs text-muted">{unit.project}</p>
      </CardBody>
    </Card>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

function StatusDot({ status }: { status: Unit['status'] }) {
  const colors = {
    AVAILABLE: 'bg-success',
    RESERVED: 'bg-warning',
    SOLD: 'bg-destructive',
  };
  const labels = { AVAILABLE: 'Còn hàng', RESERVED: 'Giữ chỗ', SOLD: 'Đã bán' };
  return (
    <span className="inline-flex items-center gap-1 rounded bg-white/90 px-2 py-0.5 text-xs font-medium shadow-sm">
      <span className={`h-2 w-2 rounded-full ${colors[status]}`} />
      {labels[status]}
    </span>
  );
}

export function PriceDisplay({ price, locked }: { price: number; locked?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold tabular-nums text-primary">{formatPrice(price)}</span>
      {locked && (
        <span className="text-xs text-muted bg-secondary px-2 py-0.5 rounded">GR 🔒</span>
      )}
    </div>
  );
}
