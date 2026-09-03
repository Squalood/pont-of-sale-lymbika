"use client";

import { useEffect, useState } from "react";
import { ProductType } from "@/types/product";
import { authFetch } from "@/lib/auth";

export type SortField = "productName" | "price" | "stock_central" | "createdAt";
export type SortDir = "asc" | "desc";

/** Filtros de la tabla de administración. `all` = sin filtrar. */
export type ProductsQuery = {
  page: number;
  pageSize: number;
  search: string;
  /** categoryName exacto, o "all". */
  category: string;
  active: "all" | "active" | "inactive";
  sortField: SortField;
  sortDir: SortDir;
};

/**
 * Campos que muchos productos tienen vacíos (310 sin stock, 2 sin precio). Al
 * ordenar por ellos se excluyen los vacíos: Strapi ignora `nullsLast` y en
 * `desc` los pone PRIMERO, así que "mayor a menor" abriría con 15 páginas de
 * "—" antes del producto con más stock. La tabla avisa cuáles quedan fuera.
 */
const NULLABLE_SORT_FIELDS: SortField[] = ["price", "stock_central"];

export function sortExcludesEmpty(field: SortField): boolean {
  return NULLABLE_SORT_FIELDS.includes(field);
}

/**
 * Solo las columnas que pinta la tabla. Pedir `fields` explícitos importa tanto
 * como paginar: `populate=*` arrastra además los inventory_lots de cada
 * producto, decenas de filas que aquí no se leen.
 */
const FIELDS = [
  "documentId",
  "productName",
  "sku",
  "sal",
  "price",
  "priceMember",
  "stock_central",
  "impuesto",
  "active",
];

function buildUrl(query: ProductsQuery): string {
  const params = FIELDS.map((f, i) => `fields[${i}]=${f}`);
  params.push("populate[images][fields][0]=url");
  params.push("populate[category][fields][0]=categoryName");

  // Cada filtro entra como un grupo dentro de $and: así el $or de la búsqueda y
  // el de "inactivo" conviven sin pisarse la clave en el query string.
  let group = 0;
  const search = query.search.trim();
  if (search) {
    const q = encodeURIComponent(search);
    params.push(`filters[$and][${group}][$or][0][productName][$containsi]=${q}`);
    params.push(`filters[$and][${group}][$or][1][sal][$containsi]=${q}`);
    group++;
  }
  if (query.category !== "all") {
    const cat = encodeURIComponent(query.category);
    params.push(`filters[$and][${group}][category][categoryName][$eq]=${cat}`);
    group++;
  }
  if (query.active === "active") {
    params.push(`filters[$and][${group}][active][$eq]=true`);
    group++;
  } else if (query.active === "inactive") {
    // El producto sin `active` capturado cuenta como inactivo, igual que lo leía
    // el filtro en cliente (`!p.active`).
    params.push(`filters[$and][${group}][$or][0][active][$eq]=false`);
    params.push(`filters[$and][${group}][$or][1][active][$null]=true`);
    group++;
  }

  if (sortExcludesEmpty(query.sortField)) {
    params.push(`filters[$and][${group}][${query.sortField}][$notNull]=true`);
    group++;
  }

  params.push(`pagination[page]=${query.page}`);
  params.push(`pagination[pageSize]=${query.pageSize}`);
  params.push(`sort=${query.sortField}:${query.sortDir}`);

  return `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products?${params.join("&")}`;
}

/**
 * Una página del catálogo, filtrada en Strapi. A diferencia de `useGetProducts`,
 * que baja el catálogo entero para que el POS pueda buscar sin red, esto trae
 * solo las filas visibles: la tabla de admin nunca necesita las otras 1.7k.
 */
export function useGetProductsPage(query: ProductsQuery) {
  const [result, setResult] = useState<ProductType[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const url = buildUrl(query);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const res = await authFetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const json = await res.json();
        setResult(json.data ?? []);
        setTotal(json.meta?.pagination?.total ?? 0);
        // Una búsqueda sin resultados devuelve pageCount 0; el suelo en 1 evita
        // que el clamp de la tabla pida `pagination[page]=0`.
        setPageCount(Math.max(1, json.meta?.pagination?.pageCount ?? 1));
        setError(null);
        setLoading(false);
      } catch (err) {
        // Al teclear en el buscador se abortan las peticiones anteriores: esa no
        // es una falla, y la que la reemplaza ya dejó `loading` en true.
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error desconocido");
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [url]);

  return { loading, result, total, pageCount, error };
}