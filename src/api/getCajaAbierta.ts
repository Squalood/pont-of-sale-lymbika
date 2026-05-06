"use client";

import { useState, useEffect, useCallback } from "react";
import { CajaType } from "@/types/caja";
import { authFetch } from "@/lib/auth";

export async function fetchCajaAbierta(): Promise<CajaType | null> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaDesde = hoy.toISOString();
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/cajas-pos?filters[estado][$eq]=Abierta&filters[fecha][$gte]=${fechaDesde}&sort=fecha:desc&pagination[pageSize]=1`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const json = await res.json();
  const cajas: CajaType[] = json.data;
  return cajas.length > 0 ? cajas[0] : null;
}

export function useGetCajaAbierta() {
  const [result, setResult] = useState<CajaType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCaja = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await fetchCajaAbierta());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaja();
  }, [fetchCaja]);

  return { result, loading, error, refetch: fetchCaja };
}
