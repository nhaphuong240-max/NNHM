import { Link } from 'react-router-dom';
import type { Priority } from '../../config/useCases';

export function PhaseBadge({ phase }: { phase: number }) {
  const colors: Record<number, string> = {
    1: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    2: 'bg-blue-100 text-blue-800 ring-blue-200',
    3: 'bg-violet-100 text-violet-800 ring-violet-200',
    4: 'bg-amber-100 text-amber-800 ring-amber-200',
    5: 'bg-orange-100 text-orange-800 ring-orange-200',
    6: 'bg-rose-100 text-rose-800 ring-rose-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ring-inset ${colors[phase] ?? 'bg-slate-100 text-slate-700'}`}>
      Phase {phase}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    M: 'bg-red-50 text-red-700 ring-red-200',
    S: 'bg-amber-50 text-amber-700 ring-amber-200',
    C: 'bg-slate-100 text-slate-600 ring-slate-200',
    W: 'bg-slate-50 text-slate-400 ring-slate-100',
  };
  const labels: Record<Priority, string> = { M: 'Must', S: 'Should', C: 'Could', W: "Won't" };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${map[priority]}`}>
      {labels[priority]}
    </span>
  );
}

export function UCBadge({ id }: { id: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-mono font-semibold">
      {id}
    </span>
  );
}

export function FlowSteps({ steps }: { steps: string[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="uc-flow-step">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
            {i + 1}
          </span>
          <span className="text-sm text-slate-700 pt-0.5">{step}</span>
        </div>
      ))}
    </div>
  );
}

export function StatCard({
  label,
  value,
  trend,
  highlight,
  icon,
}: {
  label: string;
  value: string | number;
  trend?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`stat-card ${highlight ? 'ring-2 ring-[#C9A227]/30' : ''}`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && <div className="text-[#0F4C81]/60">{icon}</div>}
      </div>
      <p className={`text-3xl font-bold mt-2 tabular-nums ${highlight ? 'text-accent' : 'text-primary'}`}>
        {value}
      </p>
      {trend && <p className="text-xs text-emerald-600 mt-1 font-medium">{trend}</p>}
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export function MockChart({ label }: { label: string }) {
  return (
    <div className="h-48 rounded-xl bg-gradient-to-t from-[#0F4C81]/5 to-transparent border border-slate-200 flex items-end justify-around px-4 pb-4 gap-2">
      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-md bg-gradient-to-t from-[#0F4C81] to-[#1a6bb5]" style={{ height: `${h}%` }} />
          <span className="text-[10px] text-slate-400">T{i + 1}</span>
        </div>
      ))}
      <span className="absolute text-xs text-slate-400 mt-2">{label}</span>
    </div>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F4C81] transition-colors">
      ← {label}
    </Link>
  );
}
