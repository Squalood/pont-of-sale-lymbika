import { ProductType } from "@/types/product";
import { ServiceRateType } from "@/types/service";
import { localStock } from "@/lib/stock";

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
  /** Sentido con el que arranca al elegir el campo; si falta, "asc". */
  defaultDir?: SortDir;
};

export const PRODUCT_SORT_OPTIONS: SortOption[] = [
  { field: "productName", label: "Nombre", asc: "A → Z", desc: "Z → A" },
  { field: "price", label: "Precio", asc: "Menor a mayor", desc: "Mayor a menor" },
  // Lo que se busca al ordenar por stock es lo que hay, no lo que falta.
  { field: "stock_central", label: "Stock", asc: "Menor a mayor", desc: "Mayor a menor", defaultDir: "desc" },
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
      // El stock que ve el cajero: el de su farmacia (o la bodega en modo legacy).
      return compareNullable(localStock(a), localStock(b), sort.dir);
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

/**
 * Los dos menús son excluyentes: elegir un orden restringe la vista a ese tipo,
 * porque ordenar por precio una lista mezclada dejaría igual los medicamentos
 * delante y el orden no serviría de nada.
 *
 * La regla vive aquí y no repartida entre `page.tsx` y `product-sidebar.tsx`,
 * que necesitan la misma respuesta: uno para armar la lista y el otro para saber
 * qué botón pintar. Cada guarda evita un callejón sin salida:
 *
 * - `soloProductos` no aplica en la categoría "consultas", donde no hay ninguno.
 * - `soloConsultas` cede ante `soloProductos` y solo cuenta donde hay consultas
 *   a la vista; si no, un orden olvidado vaciaría la pantalla sin forma de
 *   deshacerlo, porque su menú estaría escondido.
 */
export function gridMode(
  selectedCategory: string,
  productSort: SortState,
  serviceSort: SortState
) {
  const categoriaConConsultas =
    selectedCategory === "todos" || selectedCategory === "consultas";

  const soloProductos =
    selectedCategory !== "consultas" && productSort.field !== SIN_ORDEN;
  const soloConsultas =
    categoriaConConsultas && !soloProductos && serviceSort.field !== SIN_ORDEN;

  return {
    soloProductos,
    soloConsultas,
    mostrarMenuProductos: selectedCategory !== "consultas" && !soloConsultas,
    mostrarMenuConsultas: categoriaConConsultas && !soloProductos,
  };
}
