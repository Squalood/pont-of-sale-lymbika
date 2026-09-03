import { ProductType } from "@/types/product";
import { ServiceRateType } from "@/types/service";

export type SortDir = "asc" | "desc";

/** `field: "default"` = sin ordenar, se respeta el orden que trajo la API. */
export type SortState = { field: string; dir: SortDir };

export const SIN_ORDEN = "default";
export const DEFAULT_SORT: SortState = { field: SIN_ORDEN, dir: "asc" };

export type SortOption = {
  field: string;
  label: string;
  /** Cada campo nombra sus sentidos: "A → Z" dice más que "ascendente". */
  asc: string;
  desc: string;
};

export const PRODUCT_SORT_OPTIONS: SortOption[] = [
  { field: "productName", label: "Nombre", asc: "A → Z", desc: "Z → A" },
  { field: "price", label: "Precio", asc: "Menor a mayor", desc: "Mayor a menor" },
  { field: "stock_central", label: "Stock", asc: "Menor a mayor", desc: "Mayor a menor" },
  { field: "createdAt", label: "Fecha de alta", asc: "Más antiguos", desc: "Más recientes" },
];

export const SERVICE_SORT_OPTIONS: SortOption[] = [
  { field: "price", label: "Precio", asc: "Menor a mayor", desc: "Mayor a menor" },
  { field: "duration_min", label: "Duración", asc: "Más corta", desc: "Más larga" },
];

/**
 * Compara dejando lo vacío SIEMPRE al final, en los dos sentidos: un producto
 * sin precio capturado no es "el más barato" ni "el más caro", simplemente no
 * tiene precio. Aquí sí se puede hacer, porque el comparador es nuestro; la
 * tabla de admin ordena en Postgres y ahí los nulos van a un extremo fijo.
 */
function compareNullable(
  a: number | null | undefined,
  b: number | null | undefined,
  dir: SortDir
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === "asc" ? a - b : b - a;
}

function compareText(a: string, b: string, dir: SortDir): number {
  // Hay nombres capturados con un espacio delante; sin recortarlo encabezarían
  // el orden alfabético por delante de la A.
  const r = a.trim().localeCompare(b.trim(), "es", { sensitivity: "base" });
  return dir === "asc" ? r : -r;
}

export function compareProducts(a: ProductType, b: ProductType, sort: SortState): number {
  switch (sort.field) {
    case "productName":
      return compareText(a.productName, b.productName, sort.dir);
    case "price":
      return compareNullable(a.price, b.price, sort.dir);
    case "stock_central":
      return compareNullable(a.stock_central, b.stock_central, sort.dir);
    case "createdAt":
      return compareText(a.createdAt ?? "", b.createdAt ?? "", sort.dir);
    default:
      return 0;
  }
}

export function compareServices(a: ServiceRateType, b: ServiceRateType, sort: SortState): number {
  switch (sort.field) {
    case "price":
      return compareNullable(a.price, b.price, sort.dir);
    case "duration_min":
      return compareNullable(a.duration_min, b.duration_min, sort.dir);
    default:
      return 0;
  }
}
