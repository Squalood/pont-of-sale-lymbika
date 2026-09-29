import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";

export interface StockTransferType {
  id: number;
  documentId: string;
  quantity: number;
  transferred_at: string;
  notes: string | null;
  batchId: string | null;
  product: { documentId: string; productName: string } | null;
  /** null = bodega central. */
  from_pharmacy: { documentId: string; nombre: string } | null;
  to_pharmacy: { documentId: string; nombre: string } | null;
  from_lot: { documentId: string; lotNumber: string | null; expirationDate: string | null } | null;
}

/** Historial de traspasos (una fila por porción de lote), los más recientes primero. */
export function useGetTransfers(pageSize = 300) {
  const params = [
    "populate[product][fields][0]=productName",
    "populate[from_pharmacy][fields][0]=nombre",
    "populate[to_pharmacy][fields][0]=nombre",
    "populate[from_lot][fields][0]=lotNumber",
    "populate[from_lot][fields][1]=expirationDate",
    "sort=transferred_at:desc",
    `pagination[pageSize]=${pageSize}`,
  ].join("&");
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/stock-transfers?${params}`;
  const [result, setResult] = useState<StockTransferType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(url);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setResult(json.data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { result, loading, error, refetch };
}
