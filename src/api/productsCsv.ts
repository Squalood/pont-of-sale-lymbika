import { authFetch } from "@/lib/auth";

/**
 * Export / import del catálogo en CSV (`/api/export/products` del backend).
 *
 * Todo va con el JWT del usuario que inició sesión: el permiso se da en Strapi al rol
 * Operador (Users & Permissions → export.exportProducts / importProducts / fichaPrompt). Antes
 * el export usaba un token de API en una variable NEXT_PUBLIC, que cualquiera podía leer en
 * el navegador, y ese token también permitía importar y poner el stock en 0.
 *
 * Las reglas del import (celda vacía = no cambia, "-" borra, la fila con errores se salta
 * entera, nunca toca stock) viven en el backend: ver Lymbika-Backend
 * docs/ficha-clinica-productos.md §5.4 y §5.6.
 */

const BASE = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/export/products`;

export interface ImportResult {
  message: string;
  dryRun: boolean;
  created: number;
  updated: number;
  published: number;
  /** Una por fila saltada: "Fila 12 (Grimeral): fraccion: "VII" no es válido…". */
  errors: string[];
  /** Columnas ignoradas, stock_central que no se importa, etc. */
  warnings: string[];
  /** Con `crearFaltantes`: en la revisión, los que se crearían; al importar, los creados. */
  newCatalogEntries?: { principiosActivos: string[]; indicaciones: string[] };
}

export async function downloadProductsCsv(): Promise<Blob> {
  const res = await authFetch(BASE);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.blob();
}

/**
 * Texto para pegar en ChatGPT/Claude que regresa la ficha de un producto como CSV de una
 * fila. Lo arma el backend: los valores permitidos salen del schema de Strapi.
 */
export async function getFichaPrompt(documentId: string): Promise<string> {
  const res = await authFetch(`${BASE}/${encodeURIComponent(documentId)}/prompt`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.text();
}

/**
 * Lee el archivo como texto. "CSV UTF-8" de Excel viene en UTF-8, pero "CSV (delimitado por
 * comas)" se guarda en Windows-1252: leído como UTF-8, "Cafeína" llegaría como "Cafe�na" y
 * no encontraría el principio activo.
 */
async function leerCsv(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/**
 * Quita lo que los chats ponen alrededor del CSV cuando se copia su respuesta entera: el
 * cerco de Markdown (```csv … ```) y líneas en blanco al inicio o al final.
 */
function limpiarPegado(texto: string): string {
  return texto
    .trim()
    .replace(/^```[a-zA-Z]*\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
}

/**
 * Importa un archivo o un CSV pegado como texto. Con `dryRun` el backend valida todo y
 * devuelve el mismo reporte sin escribir nada. Con `crearFaltantes` crea los principios
 * activos e indicaciones que el CSV nombra y no existen (solo con el nombre, pendientes).
 * Con `soloVacios` solo llena campos vacíos (lo ya capturado se respeta y sale en `warnings`).
 * Sin `crearProductos`, una fila sin documentId es un error en vez de un producto nuevo.
 */
export async function importProductsCsv(
  origen: File | string,
  {
    dryRun,
    crearFaltantes = false,
    soloVacios = false,
    crearProductos = false,
  }: { dryRun: boolean; crearFaltantes?: boolean; soloVacios?: boolean; crearProductos?: boolean }
): Promise<ImportResult> {
  // Se reenvía como archivo (multipart) y no como JSON: el catálogo completo pasa del
  // límite de 1 MB que Strapi pone al cuerpo JSON.
  const esArchivo = typeof origen !== "string";
  const texto = esArchivo ? await leerCsv(origen) : limpiarPegado(origen);
  const form = new FormData();
  form.append("file", new Blob([texto], { type: "text/csv;charset=utf-8" }), esArchivo ? origen.name : "pegado.csv");

  const params = new URLSearchParams();
  if (dryRun) params.set("dryRun", "true");
  if (crearFaltantes) params.set("crearFaltantes", "true");
  if (soloVacios) params.set("soloVacios", "true");
  if (crearProductos) params.set("crearProductos", "true");
  const qs = params.toString();

  const res = await authFetch(`${BASE}/import${qs ? `?${qs}` : ""}`, {
    method: "POST",
    body: form,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Error ${res.status}`);
  }
  return json as ImportResult;
}
