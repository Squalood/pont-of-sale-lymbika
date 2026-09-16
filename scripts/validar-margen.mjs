/**
 * Audita la columna Margen de un export `ventas-por-producto_*.csv`.
 *
 *     node scripts/validar-margen.mjs ruta/al/ventas-por-producto_....csv
 *
 * Por qué existe: en Health Pass y Proveedor el precio de venta sale del mismo campo que el
 * reporte usa como costo (`priceMember`), así que el margen no mide el negocio — queda
 * determinado por la tarifa. Eso da un invariante que se puede verificar fila por fila:
 *
 *     Mostrador                     → variable (única tarifa donde el margen informa algo)
 *     Health Pass                   → 0
 *     Proveedor · Fee en precio Sí  → +10% del costo
 *     Proveedor · Fee en precio No  → 0   (el fee se cobró aparte, nunca entró al margen)
 *
 * Hoy el invariante se viola de forma sistemática porque `Subtotal` es neto y `Costo total`
 * es crudo: la desviación es exactamente el IVA de la línea. El script separa ese patrón del
 * resto para que, al normalizar la base fiscal del costo, se pueda confirmar que las
 * violaciones por IVA bajan a cero y solo queden las de deriva del catálogo.
 */

import fs from "node:fs";

/** Tolerancia en pesos: la misma que usa `feeSumaAlTotal` para el redondeo a centavos. */
const TOL = 0.011;
const FEE_RATE = 0.1;

/** Parser de CSV con comillas: los nombres de producto traen comas y comillas escapadas. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v !== ""));
}

const num = (v) => (v === "" || v == null ? null : Number(v));

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: node scripts/validar-margen.mjs <ventas-por-producto_....csv>");
    process.exit(1);
  }

  // El export lleva BOM para que Excel lea los acentos; hay que quitarlo antes de parsear.
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const rows = parseCSV(text);
  if (rows.length < 2) {
    console.error("El archivo no tiene filas de datos.");
    process.exit(1);
  }

  const header = rows[0];
  const col = (name) => {
    const i = header.indexOf(name);
    if (i === -1) {
      console.error(`Falta la columna "${name}". ¿Es un export por producto?`);
      process.exit(1);
    }
    return i;
  };

  const iTarifa = col("Tarifa");
  const iCosto = col("Costo total");
  const iSub = col("Subtotal");
  const iImp = col("Impuestos");
  // Se calcula, no se lee: el export ya no trae "Margen" sino "Retorno" por tarifa. El
  // invariante se sigue verificando sobre Subtotal − Costo total, que es el dato crudo.
  const iFolio = col("Folio");
  const iProd = col("Producto");
  const iFee = header.indexOf("Fee en el precio");

  if (iFee === -1) {
    console.warn(
      'Aviso: el archivo no trae "Fee en el precio". Los renglones de Proveedor no se\n' +
        "pueden clasificar y quedan fuera del conteo.\n"
    );
  }

  const cubos = {
    ok: [],
    baseFiscal: [],
    otro: [],
    sinCosto: [],
    mostrador: [],
  };

  for (const r of rows.slice(1)) {
    const tarifa = r[iTarifa];
    const costo = num(r[iCosto]);
    const margen = costo != null && num(r[iSub]) != null ? num(r[iSub]) - costo : null;
    const impuestos = num(r[iImp]) ?? 0;
    const ref = { folio: r[iFolio], producto: r[iProd], tarifa, costo, margen, impuestos };

    if (tarifa === "Mostrador") {
      cubos.mostrador.push(ref);
      continue;
    }
    // Sin costo capturado o servicio: no hay margen que validar.
    if (costo == null || margen == null) {
      cubos.sinCosto.push(ref);
      continue;
    }

    let esperado;
    if (tarifa === "Health Pass") {
      esperado = 0;
    } else if (tarifa === "Proveedor") {
      if (iFee === -1) continue;
      esperado = r[iFee] === "Sí" ? costo * FEE_RATE : 0;
    } else {
      continue;
    }

    const desv = margen - esperado;
    ref.esperado = esperado;
    ref.desv = desv;

    if (Math.abs(desv) <= TOL) cubos.ok.push(ref);
    // La firma del desajuste de base: Subtotal neto contra Costo crudo corre el margen
    // exactamente el IVA de esa línea.
    else if (Math.abs(desv + impuestos) <= TOL) cubos.baseFiscal.push(ref);
    else cubos.otro.push(ref);
  }

  const validadas = cubos.ok.length + cubos.baseFiscal.length + cubos.otro.length;
  const money = (n) => n.toFixed(2).padStart(9);

  console.log(`\nArchivo: ${file}`);
  console.log(`Renglones: ${rows.length - 1}\n`);
  console.log(`  Con invariante verificable   ${String(validadas).padStart(5)}`);
  console.log(`  Mostrador (margen libre)     ${String(cubos.mostrador.length).padStart(5)}`);
  console.log(`  Sin costo o servicio         ${String(cubos.sinCosto.length).padStart(5)}`);
  console.log("");
  console.log(`  ✓ Cumplen el invariante      ${String(cubos.ok.length).padStart(5)}`);
  console.log(`  ✗ Desviación = IVA de línea  ${String(cubos.baseFiscal.length).padStart(5)}   base fiscal del costo`);
  console.log(`  ✗ Desviación arbitraria      ${String(cubos.otro.length).padStart(5)}   costo del catálogo cambió`);

  const muestra = (titulo, lista, n = 5) => {
    if (!lista.length) return;
    console.log(`\n${titulo}`);
    for (const x of lista.slice(0, n)) {
      console.log(
        `  ${x.folio}  ${x.producto.slice(0, 26).padEnd(26)} ${x.tarifa.padEnd(11)}` +
          ` costo ${money(x.costo)}  margen ${money(x.margen)}` +
          `  esperado ${money(x.esperado)}  desv ${money(x.desv)}`
      );
    }
    if (lista.length > n) console.log(`  … y ${lista.length - n} más`);
  };

  muestra("Desviación = IVA de la línea (un solo defecto, en todas las tarifas):", cubos.baseFiscal);
  muestra("Desviación arbitraria (el costo cambió entre la venta y la exportación):", cubos.otro);

  const rotas = cubos.baseFiscal.length + cubos.otro.length;
  console.log(
    rotas === 0
      ? "\nTodos los renglones con invariante verificable lo cumplen.\n"
      : `\n${rotas} de ${validadas} renglones violan el invariante.\n`
  );
  process.exitCode = rotas === 0 ? 0 : 1;
}

main();
