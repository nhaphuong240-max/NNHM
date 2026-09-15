import { useCallback, useEffect, useState } from 'react';
import { fetchGrProjects, type GrProject } from '../lib/api';

/** FR-GR-01 — tenant projects from Golden Record API (replaces hardcoded PROJECTS). */
export function useDeveloperProjects() {
  const [projects, setProjects] = useState<GrProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGrProjects();
      setProjects(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải danh sách dự án');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    projects,
    loading,
    error,
    reload,
    defaultProjectId: projects[0]?.id ?? '',
  };
}

/** Pick projectId from URL param or first loaded project. */
export function useProjectIdSelection(urlProjectId?: string | null) {
  const { defaultProjectId, loading: loadingProjects } = useDeveloperProjects();
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    if (projectId) return;
    const pick = urlProjectId?.trim() || defaultProjectId;
    if (pick) setProjectId(pick);
  }, [projectId, urlProjectId, defaultProjectId]);

  return { projectId, setProjectId, loadingProjects };
}
