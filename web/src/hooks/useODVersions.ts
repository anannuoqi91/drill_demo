import { useEffect, useState } from "react";
import type { ODVersionItem, ODVersionsResponse } from "../api";
import { getODVersions } from "../api/home";

export function useODVersions() {
  const [odVersions, setOdVersions] = useState<ODVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const resp: ODVersionsResponse = await getODVersions();
        if (cancelled) return;
        setOdVersions(resp.rows ?? []);
      } catch (e: any) {
        if (cancelled) return;
        setError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { odVersions, loading, error };
}
