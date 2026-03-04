import { useState, useEffect } from "react";
import { authFetch } from "@/lib/auth";
import { DevolucionType } from "@/types/devolucion";

export function useGetDevoluciones() {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devoluciones-pos?populate[venta][fields][0]=id&populate[items][populate][product][fields][0]=id&sort=fecha:desc&pagination[pageSize]=5000`;
  const [result, setResult] = useState<DevolucionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(url);
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const json = await res.json();
        setResult(json.data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        setLoading(false);
      }
    })();
  }, [url]);

  return { loading, result, error };
}
