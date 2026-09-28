/**
 * Strapi exige `folio` (rechaza `null`), pero un borrador todavía no tiene uno: el folio real
 * se asigna al generar. Mientras tanto se guarda uno provisional con este prefijo, que la UI
 * trata como "sin folio" y que se reemplaza al emitir.
 */
const BORRADOR_PREFIX = "BORRADOR-";

export function folioProvisional(): string {
  return BORRADOR_PREFIX + Date.now();
}

export function esFolioProvisional(folio: string | null | undefined): boolean {
  return !!folio?.startsWith(BORRADOR_PREFIX);
}

/** Folio para mostrar o para precargar el formulario: el provisional no cuenta como folio. */
export function folioVisible(folio: string | null | undefined): string {
  return folio && !esFolioProvisional(folio) ? folio : "";
}
