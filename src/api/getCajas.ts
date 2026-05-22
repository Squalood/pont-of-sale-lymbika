"use client";

import { useState, useEffect } from "react";
import { CajaType } from "@/types/caja";
import { authFetch } from "@/lib/auth";

export function useGetCajas() {
  const [result, setResult] = useState<CajaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const url =
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/cajas-pos` +
          `?populate=pharmacy&sort=fecha:desc&pagination[pageSize]=200`;
        const res = await authFetch(url);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        setResult(json.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { result, loading, error };
}
