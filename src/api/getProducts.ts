import { useCallback, useEffect, useState } from "react";
import { ProductType } from "@/types/product";
import { authFetch } from "@/lib/auth";

/**
 * El POS sí necesita el catálogo entero en memoria: el cajero busca mientras
 * teclea y una ida y vuelta a red por búsqueda se nota en el mostrador. Lo que
 * no necesita es *todo* de cada producto — `populate=*` traía descripciones,
 * clínicas, reviews y vídeos que ningún componente lee: 4.6 MB en vez de 1.1 MB.
 *
 * La regla del recorte: se pide lo que declara `ProductType` menos los campos
 * que ningún consumidor de este hook lee (`sku`, `tipo`), marcados opcionales en
 * el tipo para que nadie cuente con ellos. Como en el repo no hay un solo
 * `as any`, lo que no está en ese tipo es ilegible para el código tipado.
 */
const FIELDS = [
  "documentId",
  "productName",
  "slug",
  "active",
  "price",
  "priceMember",
  "impuesto",
  "sal",
  "conReceta",
  "barCode",
  "stock_central",
  // Solo lo usa el menú de orden del grid. Se pide explícito en vez de confiar
  // en que el array llegue en orden por fecha, que sería un acoplamiento
  // invisible con el `sort=` de abajo.
  "createdAt",
];

const POPULATE = [
  // La tarjeta pinta la variante de 128 px a partir de la url; el resto de la
  // metadata del media (formatos, hashes, tamaños) no se usa.
  "populate[images][fields][0]=url",
  "populate[category][fields][0]=categoryName",
  "populate[category][fields][1]=slug",
  // Los lotes mandan en la venta (FEFO, vencidos, existencia real): se piden
  // explícitos, no por `populate=*`.
  "populate[inventory_lots][fields][0]=lotNumber",
  "populate[inventory_lots][fields][1]=expirationDate",
  "populate[inventory_lots][fields][2]=initialQuantity",
  "populate[inventory_lots][fields][3]=currentAmount",
  "populate[inventory_lots][fields][4]=state",
];

interface UseGetProductsOptions {
  /**
   * Farmacia cuyo stock y lotes se quieren (la de la caja). Sin farmacia, el catálogo
   * representa el total: `stock_central` y los lotes de todas las ubicaciones.
   */
  pharmacyDocId?: string | null;
  /** `false` = todavía no pedir (ej. mientras se sabe el modo). */
  enabled?: boolean;
}

/**
 * Con farmacia: su stock y SOLO sus lotes. La caja no debe ver (ni elegir) lotes que están
 * físicamente en otra farmacia. Sin farmacia (pantallas de admin): todos los lotes, para
 * compararlos contra el total.
 */
function locationPopulate(pharmacyDocId: string | null): string[] {
  if (!pharmacyDocId) return [];
  const ph = encodeURIComponent(pharmacyDocId);
  return [
    `populate[inventory_lots][filters][pharmacy][documentId][$eq]=${ph}`,
    `populate[pharmacy_stocks][filters][pharmacy][documentId][$eq]=${ph}`,
    "populate[pharmacy_stocks][fields][0]=stock",
    "populate[pharmacy_stocks][fields][1]=min_stock",
  ];
}

export function useGetProducts({ pharmacyDocId = null, enabled = true }: UseGetProductsOptions = {}) {
  const location = pharmacyDocId;
  const params = [
    ...FIELDS.map((f, i) => `fields[${i}]=${f}`),
    ...POPULATE,
    ...locationPopulate(location),
    "pagination[page]=1",
    "pagination[pageSize]=5000",
    "sort=createdAt:desc",
  ].join("&");
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products?${params}`;
  const [result, setResult] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await authFetch(url);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      const data: ProductType[] = json.data;
      // Sin permiso de lectura sobre pharmacy-stock, Strapi omite el populate en silencio y el
      // producto llegaría sin `pharmacy_stocks`, que `localStock` leería como el total. Con
      // farmacia, "no vino" es "no hay stock aquí".
      setResult(location ? data.map((p) => ({ ...p, pharmacy_stocks: p.pharmacy_stocks ?? [] })) : data);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  }, [url, enabled, location]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { loading, result, error, refetch: fetchProducts };
}
