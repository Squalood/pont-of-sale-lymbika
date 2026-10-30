"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import type { LoteState } from "@/types/lote";

export interface LoteSearchResult {
  documentId: string;
  lotNumber: string | null;
  expirationDate: string | null;
  currentAmount: number;
  state: LoteState;
  product: { documentId: string; productName: string } | null;
  pharmacy: { documentId: string; nombre: string } | null;
}

/** Lote físico: los registros del mismo producto y número, que el rastreo junta en uno. */
export interface LoteGroup {
  key: string;
  /** Registro con el que se abre el rastreo; el backend encuentra los demás. */
  documentId: string;
  lotNumber: string | null;
  expirationDate: string | null;
  productName: string;
  currentAmount: number;
  locations: string[];
  states: LoteState[];
}

const DEBOUNCE_MS = 300;
const LIMIT = 100;

function group(rows: LoteSearchResult[]): LoteGroup[] {
  const map = new Map<string, LoteGroup>();
  for (const r of rows) {
    const key = `${r.product?.documentId ?? "?"}|${r.lotNumber ?? r.documentId}`;
    const g = map.get(key) ?? {
      key,
      documentId: r.documentId,
      lotNumber: r.lotNumber,
      expirationDate: r.expirationDate,
      productName: r.product?.productName ?? "Sin producto",
      currentAmount: 0,
      locations: [],
      states: [],
    };
    g.currentAmount += Number(r.currentAmount ?? 0);
    const place = r.pharmacy?.nombre ?? "Bodega central";
    if (!g.locations.includes(place)) g.locations.push(place);
    if (!g.states.includes(r.state)) g.states.push(r.state);
    map.set(key, g);
  }
  return [...map.values()];
}

/**
 * Búsqueda de lotes por número o por producto, **en todos los estados**: un lote agotado es
 * justo el que importa en un retiro, y ninguna otra pantalla lo lista.
 */
export function useSearchLotes(term: string) {
  const [results, setResults] = useState<LoteGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = term.trim();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      const q = encodeURIComponent(query);
      const params = [
        "fields[0]=documentId",
        "fields[1]=lotNumber",
        "fields[2]=expirationDate",
        "fields[3]=currentAmount",
        "fields[4]=state",
        "populate[product][fields][0]=documentId",
        "populate[product][fields][1]=productName",
        "populate[pharmacy][fields][0]=documentId",
        "populate[pharmacy][fields][1]=nombre",
        `filters[$or][0][lotNumber][$containsi]=${q}`,
        `filters[$or][1][product][productName][$containsi]=${q}`,
        "sort=expirationDate:desc",
        `pagination[pageSize]=${LIMIT}`,
      ];
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory-lots?${params.join("&")}`;

      try {
        const res = await authFetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        setResults(group(json.data ?? []));
        setError(null);
        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(err instanceof Error ? err.message : "Error desconocido");
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { results, loading, error };
}
