/**
 * Descarga cliente-side de un CSV. El BOM al inicio es lo que hace que Excel en
 * español lea los acentos en vez de mojibake.
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Sufijo de fechas para el nombre del archivo: `2026-01-01_2026-08-17` o `todo`. */
export function csvStamp(from: Date | null, to: Date | null): string {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  if (!from) return "todo";
  return `${iso(from)}_${iso(to ?? new Date())}`;
}
