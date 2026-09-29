import { authFetch } from "@/lib/auth";
import type { StockLocation } from "@/api/posStock";

export interface LoteAt {
  documentId: string;
  lotNumber: string | null;
  expirationDate: string | null;
  currentAmount: number;
  state: "activo" | "agotado" | "vencido";
}

/**
 * Lotes activos con existencia de un producto en una ubicación (farmacia o bodega), ordenados
 * por caducidad. Los usa el traspaso para dejar elegir de qué lote sale la mercancía.
 */
export async function getLotesAt(
  productDocumentId: string,
  location: StockLocation,
  /** También los agotados (en 0): la corrección de un lote puede reponerlos. */
  { includeEmpty = false }: { includeEmpty?: boolean } = {}
): Promise<LoteAt[]> {
  const params = [
    `filters[product][documentId][$eq]=${encodeURIComponent(productDocumentId)}`,
    ...(includeEmpty
      ? ["filters[state][$in][0]=activo", "filters[state][$in][1]=agotado"]
      : ["filters[state][$eq]=activo", "filters[currentAmount][$gt]=0"]),
    location
      ? `filters[pharmacy][documentId][$eq]=${encodeURIComponent(location)}`
      : "filters[pharmacy][id][$null]=true",
    "fields[0]=lotNumber",
    "fields[1]=expirationDate",
    "fields[2]=currentAmount",
    "fields[3]=state",
    "sort=expirationDate:asc",
    "pagination[pageSize]=100",
  ].join("&");
  const res = await authFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory-lots?${params}`);
  if (!res.ok) throw new Error(`Error al cargar lotes (${res.status})`);
  const json = await res.json();
  return json.data as LoteAt[];
}
