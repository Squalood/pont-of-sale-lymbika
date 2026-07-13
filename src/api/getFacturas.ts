import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { FacturaType } from "@/types/factura";

export function useGetFacturas() {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/facturas?populate=*&sort=fecha:desc&pagination[pageSize]=1000`;
  const [result, setResult] = useState<FacturaType[]>([]);
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
