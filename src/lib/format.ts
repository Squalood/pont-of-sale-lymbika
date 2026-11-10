/**
 * Formato único de dinero en pantalla y tickets: es-MX, separador de miles y siempre
 * 2 decimales. No usar en CSV: ahí van números crudos (`toFixed(2)`) para que Excel
 * y `validar-margen` los lean como número.
 */
export function fmtNum(n: number): string {
  // `?? 0`: Strapi puede mandar null en montos opcionales aunque el tipo diga number.
  return (n ?? 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `$1,234.50`; los negativos llevan el signo antes del `$` (`-$5.00`), no `$-5.00`. */
export function fmtMoney(n: number): string {
  // Se redondea antes de decidir el signo para que -0.001 no salga como "-$0.00".
  const r = Math.round(n * 100) / 100;
  // Math.abs también limpia el -0 que deja redondear negativos chicos.
  return r < 0 ? `-$${fmtNum(-r)}` : `$${fmtNum(Math.abs(r))}`;
}

export function fmtInt(n: number): string {
  return n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

/** Forma corta para ticks de eje y etiquetas de barra, donde no cabe la cifra completa. */
export function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${Math.round(n)}`;
}
