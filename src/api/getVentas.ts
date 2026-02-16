"use client";

import { useState, useEffect } from "react";
import { VentaType } from "@/types/venta";

export function useGetVentas() {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ventas-pos?populate=*&sort=fecha:desc&pagination[pageSize]=5000`;
  const [result, setResult] = useState<VentaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(url);
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
