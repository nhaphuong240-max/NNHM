import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeveloperShell } from '../../components/DeveloperShell';
import {
  createGrProject,
  deleteGrProject,
  fetchGrProjects,
  updateGrProject,
  type CreateGrProjectInput,
  type GrProject,
} from '../../lib/api';
import { brand } from '../../theme/tokens';

const EMPTY_FORM: CreateGrProjectInput = {
  code: '',
  name: '',
  city: '',
  district: '',
  latitude: null,
  longitude: null,
};

function toForm(project: GrProject): CreateGrProjectInput {
  return {
    code: project.attributes.code,
    name: project.attributes.name,
    city: project.attributes.city ?? '',
    district: project.attributes.district ?? '',
    latitude: project.attributes.latitude,
    longitude: project.attributes.longitude,
  };
}

export function DeveloperProjectsPage() {
  const [projects, setProjects] = useState<GrProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState<CreateGrProjectInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGrProjects();
      setProjects(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải danh sách dự án');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(project: GrProject) {
    setEditingId(project.id);
    setForm(toForm(project));
    setMessage(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError('Mã và tên dự án là bắt buộc.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload: CreateGrProjectInput = {
        code: form.code.trim(),
        name: form.name.trim(),
        city: form.city?.trim() || null,
        district: form.district?.trim() || null,
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
      };

      if (editingId) {
        const res = await updateGrProject(editingId, payload);
        setProjects((prev) => prev.map((p) => (p.id === editingId ? res.data : p)));
        setMessage(`Đã cập nhật ${res.data.attributes.name}`);
      } else {
        const res = await createGrProject(payload);
        setProjects((prev) => [...prev, res.data].sort((a, b) =>
          a.attributes.name.localeCompare(b.attributes.name, 'vi'),
        ));
        setMessage(`Đã tạo dự án ${res.data.attributes.name} · ${res.data.id}`);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(project: GrProject) {
    const ok = window.confirm(
      `Xóa dự án "${project.attributes.name}" (${project.id})?\nChỉ xóa được khi chưa có căn trên bảng hàng.`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await deleteGrProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      if (editingId === project.id) resetForm();
      setMessage(`Đã xóa ${project.attributes.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeveloperShell
      title="Quản lý dự án"
      subtitle="FR-GR-01 · SCR-DEV-013 · Golden Record projects CRUD"
      screenTag="Developer / Projects"
    >
      {error && (
        <p className="text-sm rounded-xl p-3 mb-4" style={{ background: '#FEE2E2', color: brand.destructive }}>
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm rounded-xl p-3 mb-4" style={{ background: '#DCFCE7', color: brand.success }}>
          {message}
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl p-5 space-y-4"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <h2 className="font-semibold text-lg" style={{ color: brand.ink }}>
            {editingId ? 'Sửa dự án' : 'Thêm dự án mới'}
          </h2>

          <div>
            <label className="text-xs font-medium" style={{ color: brand.muted }}>
              Mã dự án *
            </label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="VD: SUNRISE-B"
              className="block mt-1 w-full h-10 px-3 rounded-lg border text-sm"
              style={{ borderColor: brand.border, background: brand.surface }}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: brand.muted }}>
              Tên dự án *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Sunrise Tower B"
              className="block mt-1 w-full h-10 px-3 rounded-lg border text-sm"
              style={{ borderColor: brand.border, background: brand.surface }}
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium" style={{ color: brand.muted }}>
                Thành phố
              </label>
              <input
                value={form.city ?? ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Hà Nội"
                className="block mt-1 w-full h-10 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border, background: brand.surface }}
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: brand.muted }}>
                Quận
              </label>
              <input
                value={form.district ?? ''}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder="Cầu Giấy"
                className="block mt-1 w-full h-10 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border, background: brand.surface }}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium" style={{ color: brand.muted }}>
                Vĩ độ (map)
              </label>
              <input
                type="number"
                step="any"
                value={form.latitude ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    latitude: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="21.0285"
                className="block mt-1 w-full h-10 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border, background: brand.surface }}
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: brand.muted }}>
                Kinh độ (map)
              </label>
              <input
                type="number"
                step="any"
                value={form.longitude ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    longitude: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="105.8542"
                className="block mt-1 w-full h-10 px-3 rounded-lg border text-sm"
                style={{ borderColor: brand.border, background: brand.surface }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: brand.primary }}
            >
              {busy ? 'Đang lưu…' : editingId ? 'Cập nhật' : 'Thêm dự án'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{ background: brand.hover, color: brand.primaryDark }}
              >
                Hủy sửa
              </button>
            )}
          </div>
        </form>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: brand.border }}>
            <h2 className="font-semibold" style={{ color: brand.ink }}>
              Dự án trong tenant
            </h2>
            <p className="text-xs mt-1" style={{ color: brand.muted }}>
              {loading ? 'Đang tải…' : `${projects.length} dự án · chỉ DEVELOPER_ADMIN được sửa/xóa`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: brand.surface, color: brand.muted }}>
                  <th className="text-left px-4 py-2 font-medium">Tên</th>
                  <th className="text-left px-4 py-2 font-medium">Mã</th>
                  <th className="text-left px-4 py-2 font-medium">Khu vực</th>
                  <th className="text-right px-4 py-2 font-medium">Căn</th>
                  <th className="text-right px-4 py-2 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: brand.muted }}>
                      Chưa có dự án — thêm form bên trái.
                    </td>
                  </tr>
                )}
                {projects.map((p) => (
                  <tr key={p.id} className="border-t" style={{ borderColor: brand.border }}>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: brand.ink }}>
                        {p.attributes.name}
                      </p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: brand.muted }}>
                        {p.id}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono">{p.attributes.code}</td>
                    <td className="px-4 py-3" style={{ color: brand.muted }}>
                      {[p.attributes.district, p.attributes.city].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.attributes.unitCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end flex-wrap gap-2">
                        <Link
                          to={`/developer/units?projectId=${encodeURIComponent(p.id)}`}
                          className="text-xs font-semibold no-underline px-2 py-1 rounded-lg"
                          style={{ background: brand.hover, color: brand.primaryDark }}
                        >
                          Bảng hàng
                        </Link>
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-xs font-semibold px-2 py-1 rounded-lg"
                          style={{ background: brand.hover, color: brand.primaryDark }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(p)}
                          disabled={busy || p.attributes.unitCount > 0}
                          title={
                            p.attributes.unitCount > 0
                              ? 'Xóa hết căn trước khi xóa dự án'
                              : 'Xóa dự án'
                          }
                          className="text-xs font-semibold px-2 py-1 rounded-lg disabled:opacity-40"
                          style={{ background: '#FEE2E2', color: brand.destructive }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DeveloperShell>
  );
}
