import { authFetch } from "@/lib/auth";

/**
 * Export / import del catálogo en CSV (`/api/export/products` del backend).
 *
 * Los dos van con el JWT del usuario que inició sesión: el permiso se da en Strapi al rol
 * Operador (Users & Permissions → export.exportProducts / export.importProducts). Antes el
 * export usaba un token de API en una variable NEXT_PUBLIC, que cualquiera podía leer en el
 * navegador, y ese token también permitía importar y poner el stock en 0.
 *
 * Las reglas del import (celda vacía = no cambia, "-" borra, la fila con errores se salta
 * entera, nunca toca stock) viven en el backend: ver Lymbika-Backend
 * docs/ficha-clinica-productos.md §5.4.
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
}

export async function downloadProductsCsv(): Promise<Blob> {
  const res = await authFetch(BASE);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.blob();
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

/** Con `dryRun` el backend valida todo y devuelve el mismo reporte sin escribir nada. */
export async function importProductsCsv(file: File, { dryRun }: { dryRun: boolean }): Promise<ImportResult> {
  // Se reenvía como archivo (multipart) y no como JSON: el catálogo completo pasa del
  // límite de 1 MB que Strapi pone al cuerpo JSON.
  const texto = await leerCsv(file);
  const form = new FormData();
  form.append("file", new Blob([texto], { type: "text/csv;charset=utf-8" }), file.name);

  const res = await authFetch(`${BASE}/import${dryRun ? "?dryRun=true" : ""}`, {
    method: "POST",
    body: form,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Error ${res.status}`);
  }
  return json as ImportResult;
}
