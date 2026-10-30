"use client";

import { useState, useEffect } from "react";
import { VentaType } from "@/types/venta";
import { authFetch } from "@/lib/auth";

// populate=* NO puebla relaciones dentro de componentes: hay que pedir explícitamente
// el `product`/`service_rate` de cada línea `venta` para que la devolución sepa a qué
// producto devolver el stock. Los campos escalares del componente (incl. lotDocumentId)
// siguen viniendo automáticamente.
const POPULATE = [
  "populate[venta][populate][product][fields][0]=id",
  "populate[venta][populate][product][fields][1]=documentId",
  "populate[venta][populate][product][fields][2]=productName",
  "populate[venta][populate][service_rate][fields][0]=id",
  "populate[venta][populate][service_rate][fields][1]=documentId",
  "populate[pharmacies][fields][0]=documentId",
  "populate[pharmacies][fields][1]=nombre",
];

/** Una venta con lo mismo que trae el historial, para abrir su detalle desde otra pantalla. */
export async function fetchVenta(documentId: string): Promise<VentaType> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ventas-pos/${encodeURIComponent(documentId)}?${POPULATE.join("&")}`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  const json = await res.json();
  return json.data;
}

export function useGetVentas() {
  const params = [...POPULATE, "sort=fecha:desc", "pagination[pageSize]=5000"].join("&");
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ventas-pos?${params}`;
  const [result, setResult] = useState<VentaType[]>([]);
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
