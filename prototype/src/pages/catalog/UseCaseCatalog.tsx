import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, LayoutGrid, ChevronRight } from 'lucide-react';
import { USE_CASES, MODULES, type UseCase, type Portal } from '../../config/useCases';
import { PhaseBadge, PriorityBadge, UCBadge } from '../../components/premium/PremiumUI';
import { Button } from '../../components/ui/Button';

const phases = [1, 2, 3, 4, 5, 6];

export default function UseCaseCatalog() {
  const [query, setQuery] = useState('');
  const [module, setModule] = useState('');
  const [phase, setPhase] = useState<number | ''>('');
  const [priority, setPriority] = useState('');

  const [portal, setPortal] = useState<Portal | ''>('');

  const filtered = useMemo(() => {
    return USE_CASES.filter((uc) => {
      if (query && !`${uc.id} ${uc.title} ${uc.actors}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (module && uc.module !== module) return false;
      if (phase && uc.phase !== phase) return false;
      if (priority && uc.priority !== priority) return false;
      if (portal && uc.portal !== portal) return false;
      return true;
    });
  }, [query, module, phase, priority, portal]);

  const stats = useMemo(() => ({
    total: USE_CASES.length,
    p1: USE_CASES.filter((u) => u.phase === 1).length,
    must: USE_CASES.filter((u) => u.priority === 'M').length,
  }), []);

  return (
    <div className="min-h-screen">
      <header className="premium-gradient text-white">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-10 lg:py-14">
          <Link to="/" className="text-white/60 hover:text-white text-sm mb-4 inline-block">← Portal Hub</Link>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Use Case Catalog</h1>
          <p className="text-white/70 mt-2 max-w-2xl">
            Toàn bộ {stats.total} use cases WEREAL REOS — click để mở màn hình prototype tương ứng
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/10 rounded-xl px-4 py-2 ring-1 ring-white/10">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-white/60">Total UC</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 ring-1 ring-white/10">
              <p className="text-2xl font-bold">{stats.p1}</p>
              <p className="text-xs text-white/60">Phase 1</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 ring-1 ring-white/10">
              <p className="text-2xl font-bold">{stats.must}</p>
              <p className="text-xs text-white/60">Must Have</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
        {/* Filters */}
        <div className="glass-card rounded-2xl p-4 mb-8 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm UC, tiêu đề, actor..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm"
            />
          </div>
          <select value={module} onChange={(e) => setModule(e.target.value)} className="h-11 px-4 rounded-xl border bg-white text-sm">
            <option value="">Tất cả module</option>
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={phase} onChange={(e) => setPhase(e.target.value ? Number(e.target.value) : '')} className="h-11 px-4 rounded-xl border bg-white text-sm">
            <option value="">Tất cả phase</option>
            {phases.map((p) => <option key={p} value={p}>Phase {p}</option>)}
          </select>
          <select value={portal} onChange={(e) => setPortal(e.target.value as Portal | '')} className="h-11 px-4 rounded-xl border bg-white text-sm">
            <option value="">Tất cả portal</option>
            <option value="developer">Chủ đầu tư (Developer)</option>
            <option value="agent">Agent / Agency</option>
            <option value="admin">Admin / Ops</option>
            <option value="public">Public / Buyer</option>
            <option value="finance">Finance</option>
            <option value="buyer">Buyer deal</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-11 px-4 rounded-xl border bg-white text-sm">
            <option value="">Priority</option>
            <option value="M">Must</option>
            <option value="S">Should</option>
            <option value="C">Could</option>
          </select>
          <Button variant="outline" onClick={() => { setQuery(''); setModule(''); setPhase(''); setPriority(''); setPortal(''); }}>
            <Filter className="h-4 w-4" /> Reset
          </Button>
        </div>

        <p className="text-sm text-slate-500 mb-4">{filtered.length} use cases</p>

        {/* Grid by module */}
        {MODULES.map((mod) => {
          const items = filtered.filter((u) => u.module === mod);
          if (items.length === 0) return null;
          return (
            <section key={mod} className="mb-10">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-[#0F4C81]" />
                Module {mod}
                <span className="text-sm font-normal text-slate-400">({items.length})</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((uc) => (
                  <UCCard key={uc.id} uc={uc} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function UCCard({ uc }: { uc: UseCase }) {
  return (
    <Link to={`/uc/${uc.id}`} className="group glass-card rounded-2xl p-5 hover:shadow-lg hover:ring-2 hover:ring-[#0F4C81]/20 transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <UCBadge id={uc.id} />
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#0F4C81] transition-colors" />
      </div>
      <h3 className="font-semibold text-sm text-slate-900 leading-snug group-hover:text-[#0F4C81] transition-colors">{uc.title}</h3>
      <p className="text-xs text-slate-500 mt-2 line-clamp-1">{uc.actors}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <PhaseBadge phase={uc.phase} />
        <PriorityBadge priority={uc.priority} />
      </div>
    </Link>
  );
}
