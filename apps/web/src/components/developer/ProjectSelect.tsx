import { useDeveloperProjects } from '../../hooks/useDeveloperProjects';
import { brand } from '../../theme/tokens';

type ProjectSelectProps = {
  value: string;
  onChange: (projectId: string) => void;
  className?: string;
  minWidth?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function ProjectSelect({
  value,
  onChange,
  className,
  minWidth = '200px',
  allowEmpty = false,
  emptyLabel = '— Chọn dự án —',
}: ProjectSelectProps) {
  const { projects, loading, error } = useDeveloperProjects();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading || (!allowEmpty && projects.length === 0)}
      className={className ?? 'block mt-1 h-10 px-3 rounded-lg border text-sm'}
      style={{ borderColor: brand.border, background: brand.surface, minWidth }}
      aria-busy={loading}
      title={error ?? undefined}
    >
      {allowEmpty && (
        <option value="">{loading ? 'Đang tải…' : emptyLabel}</option>
      )}
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.attributes.name}
        </option>
      ))}
    </select>
  );
}
