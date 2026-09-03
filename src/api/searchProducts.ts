"use client";

import { useEffect, useState } from "react";
import { ProductType } from "@/types/product";
import { authFetch } from "@/lib/auth";

/**
 * Lo que necesitan los desplegables al pintar y al elegir un producto: el nombre
 * y el precio que se muestran, más el documentId y el stock que se escriben
 * después. Sin `populate`: ninguno de los dos autocompletados pinta imagen.
 */
const FIELDS = [
  "documentId",
  "productName",
  "sal",
  "sku",
  "barCode",
  "price",
  "priceMember",
  "stock_central",
];

/** Se busca por lo que el usuario tiene a la vista: caja, receta o etiqueta. */
const SEARCH_FIELDS = ["productName", "sal", "sku", "barCode"];

const DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 8;

/**
 * Autocompletado de productos resuelto en Strapi. Reemplaza al `.filter()` sobre
 * el catálogo entero: para ofrecer 8 opciones no hace falta tener las 1.7k en
 * memoria, y así el stock que se lee es de hace segundos y no del montaje de la
 * página.
 */
export function useSearchProducts(term: string, limit = DEFAULT_LIMIT) {
  const [results, setResults] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);
  const query = term.trim();

  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    // Se marca ya, antes del debounce: el desplegable avisa que está buscando
    // desde la primera tecla.
    setLoading(true);

    const timer = setTimeout(async () => {
      const params = FIELDS.map((f, i) => `fields[${i}]=${f}`);
      const q = encodeURIComponent(query);
      SEARCH_FIELDS.forEach((f, i) =>
        params.push(`filters[$or][${i}][${f}][$containsi]=${q}`)
      );
      params.push(`pagination[pageSize]=${limit}`);
      params.push("sort=productName:asc");

      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products?${params.join("&")}`;

      try {
        const res = await authFetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        setResults(json.data ?? []);
        setLoading(false);
      } catch {
        // Al seguir tecleando se aborta la búsqueda anterior; la que la
        // reemplaza ya dejó `loading` en true.
        if (controller.signal.aborted) return;
        setResults([]);
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, limit]);

  return { results, loading };
}
