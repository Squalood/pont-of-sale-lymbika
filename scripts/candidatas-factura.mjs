/**
 * Arma la lista de compras que sirven para contrastar contra la factura del proveedor.
 *
 *     node scripts/candidatas-factura.mjs ruta/al/compras_....csv
 *
 * Qué se está comprobando: la app calcula el total de cada línea como
 * `lo tecleado × (1 + IVA)`, así que su Total delata qué se capturó en el campo "Precio".
 * Si coincide con la factura, se tecleó el **neto**; si sale más alto, se tecleó el
 * **bruto**. De eso depende si hay que corregir el reporte o el cobro — ver
 * `docs/pendiente-margen-por-producto.md`.
 *
 * Una compra solo sirve si cumple las tres:
 *   - tiene **factura adjunta**, para no salir a buscar el papel
 *   - tiene **tasa de IVA registrada**, porque sin tasa el multiplicador es 1 y el total
 *     no distingue nada (el selector viene en "exento" por omisión)
 *   - tiene **costos registrados**, porque las de total 0 no tienen nada que comparar
 *
 * La selección reparte entre proveedores y operadores distintos: lo que se mide es un
 * hábito de captura de personas, y puede no ser uniforme entre ellas.
 */

import fs from "node:fs";

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v !== ""));
}

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/candidatas-factura.mjs <compras_....csv>");
  process.exit(1);
}

const rows = parseCSV(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
const header = rows[0];
const idx = (n) => header.indexOf(n);

if (idx("IVA registrado") === -1) {
  console.error(
    'El archivo no trae la columna "IVA registrado".\n' +
      "Vuelve a exportar Compras desde el Dashboard con la versión actual de la app."
  );
  process.exit(1);
}

const compras = rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));

const sirven = compras.filter(
  (c) =>
    c["Factura adjunta"] !== "" &&
    c["IVA registrado"] !== "No" &&
    c["Costos registrados"] === "Sí"
);

// Reparto: se recorre por pares proveedor×operador aún no cubiertos, luego por proveedor
// nuevo, luego por operador nuevo. Así la muestra cubre lo más posible con pocas revisiones.
const seleccion = [];
const pares = new Set(), provs = new Set(), opers = new Set();
const puntua = (c) => {
  const par = `${c.Proveedor}|${c.Operador}`;
  return (
    (pares.has(par) ? 0 : 4) + (provs.has(c.Proveedor) ? 0 : 2) + (opers.has(c.Operador) ? 0 : 1)
  );
};
const restantes = [...sirven];
while (restantes.length) {
  restantes.sort((a, b) => puntua(b) - puntua(a) || Number(b.Total) - Number(a.Total));
  const c = restantes.shift();
  if (puntua(c) === 0 && seleccion.length >= 8) break;
  seleccion.push(c);
  pares.add(`${c.Proveedor}|${c.Operador}`);
  provs.add(c.Proveedor);
  opers.add(c.Operador);
}

const sinFactura = compras.filter((c) => c["Factura adjunta"] === "").length;
const sinIva = compras.filter((c) => c["IVA registrado"] === "No").length;

console.log(`\nArchivo: ${file}`);
console.log(`Compras en el período: ${compras.length}`);
console.log(`  sin factura adjunta        ${String(sinFactura).padStart(4)}   no sirven`);
console.log(`  sin tasa de IVA capturada  ${String(sinIva).padStart(4)}   no sirven`);
console.log(`  utilizables                ${String(sirven.length).padStart(4)}`);
console.log(
  `\nSeleccionadas ${seleccion.length}, cubriendo ${provs.size} proveedor(es) y ${opers.size} operador(es).\n`
);

const w = (s, n) => String(s).slice(0, n).padEnd(n);
console.log(
  `  ${w("Folio", 7)} ${w("Fecha", 11)} ${w("Proveedor", 24)} ${w("Operador", 10)} ` +
    `${"Total app".padStart(11)} ${w("IVA", 8)} Factura adjunta`
);
console.log("  " + "-".repeat(104));
for (const c of seleccion) {
  console.log(
    `  ${w(c.Folio, 7)} ${w(c.Fecha.split(",")[0], 11)} ${w(c.Proveedor, 24)} ` +
      `${w(c.Operador, 10)} ${Number(c.Total).toFixed(2).padStart(11)} ` +
      `${w(c["IVA registrado"], 8)} ${c["Factura adjunta"]}`
  );
}

console.log(`
Para cada una: abre la factura adjunta y compara su total contra "Total app".

    coinciden        -> se tecleó el NETO   -> el POS cobra de menos al socio (problema de cobro)
    app sale ~8-16% mayor -> se tecleó el BRUTO -> solo hay que corregir el reporte

Anota el resultado de las ${seleccion.length}. Si salen mezclados, el campo no tiene una sola
base y la normalización tendrá que decidirse producto por producto.
`);
