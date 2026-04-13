"use client";

import { useState, useEffect, useCallback } from "react";
import { CompraType } from "@/types/compra";
import { authFetch } from "@/lib/auth";

export function useGetCompras() {
  const url =
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/compras-pos` +
    `?populate[proveedor][fields][0]=name` +
    `&populate[proveedor][fields][1]=documentId` +
    `&populate[items][populate][product][fields][0]=id` +
    `&populate[items][populate][product][fields][1]=productName` +
    `&populate[archivo][fields][0]=url` +
    `&populate[archivo][fields][1]=name` +
    `&sort=fecha:desc` +
    `&pagination[pageSize]=5000`;

  const [result, setResult] = useState<CompraType[]>([]);
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
