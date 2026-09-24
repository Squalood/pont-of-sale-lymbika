import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { FacturaType } from "@/types/factura";

export function useGetFacturas() {
  // `populate=*` no baja a la relación dentro del componente `items`; sin el documentId del
  // producto, editar un borrador perdería el vínculo de cada línea con el catálogo.
  const url =
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/facturas` +
    `?populate[items][populate][product][fields][0]=productName` +
    `&populate[items][populate][product][fields][1]=documentId` +
    `&populate[pharmacy]=true` +
    `&sort=fecha:desc` +
    `&pagination[pageSize]=1000`;
  const [result, setResult] = useState<FacturaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

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
  }, [url, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { loading, result, error, refetch };
}
