"use client";

import { useState, useEffect, useCallback } from "react";
import { LoteType } from "@/types/lote";
import { authFetch } from "@/lib/auth";

/**
 * Lotes para la pantalla de caducidades. Se piden solo `activo` y `vencido`:
 * los `agotado` ya se vendieron y son ruido puro aquí.
 *
 * No se recortan `fields` a propósito. El content-type es chico, y pedir campos
 * explícitos rompería la pantalla con un 400 mientras los campos de merma no
 * existan en Strapi; así los `discarded*` simplemente llegan `undefined`.
 *
 * `stock_central` en el populate del producto es lo que permite calcular el
 * stock resultante al desechar sin un segundo fetch por producto.
 */
export function useGetLotes() {
  const url =
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory-lots` +
    `?filters[state][$in][0]=activo` +
    `&filters[state][$in][1]=vencido` +
    `&populate[product][fields][0]=documentId` +
    `&populate[product][fields][1]=productName` +
    `&populate[product][fields][2]=stock_central` +
    `&populate[compra][fields][0]=documentId` +
    `&sort=expirationDate:asc` +
    `&pagination[pageSize]=5000`;

  const [result, setResult] = useState<LoteType[]>([]);
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
        setError(null);
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
