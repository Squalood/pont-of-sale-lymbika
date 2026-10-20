/**
 * Audita el retorno de un export `ventas-por-producto_*.csv`.
 *
 *     npm run validar-margen -- ruta/al/ventas-por-producto_....csv
 *
 * En membresía y Proveedor el precio de venta se deriva del mismo `priceMember` que el
 * reporte usa como costo, así que el retorno de esas dos tarifas está determinado por la
 * tarifa y se puede verificar fila por fila:
 *
 *     Mostrador                     → variable, no hay valor esperado
 *     Membresía                     → 0            (se vende al costo de proveedor)
 *     Proveedor · Fee en precio Sí  → +10% del costo
 *     Proveedor · Fee en precio No  → 0            (el fee se cobró aparte del renglón)
 *
 * La membresía se reconoce por descarte (ni Mostrador ni Proveedor) y no por nombre: el export
 * escribe el nombre comercial de `site-config.membershipName`, que puede cambiar, y los
 * archivos viejos dicen "Health Pass".
 *
 * Las violaciones se separan en tres, y la fecha de la venta es lo que decide cuál es cuál:
 * el 2026-09-17 se arreglaron dos cosas a la vez (el cobro del IVA en proveedor, y el
 * congelado de costo y tasa en la línea), así que antes y después significan cosas distintas.
 *
 *  - **IVA de línea**, solo antes del corte: se cobraba el costo neto como si fuera el total.
 *    Histórico y no se corrige.
 *  - **Deriva del catálogo**, solo antes del corte: el costo cambió entre la venta y la
 *    exportación (ver `docs/pendiente-costo-historico.md`). Tampoco se corrige.
 *  - **Revisar**: todo lo que no cuadra desde el corte. Ahí el costo ya va congelado en la
 *    línea, así que no puede ser deriva: es un precio tecleado a mano en el carrito, o una
 *    anomalía real. Es el único cubo que pide acción, y el único que mueve el exit code.
 */

import fs from "node:fs";

/** Tolerancia en pesos: la misma que usa `feeSumaAlTotal` para el redondeo a centavos. */
const TOL = 0.011;
const FEE_RATE = 0.1;

/** Día en que se arreglaron el cobro del IVA y el congelado de costo. Ver el encabezado. */
const CORTE = "2026-09-17";

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

/**
 * La columna `Fecha` la escribe `toLocaleString("es-MX")`: `17/9/2026, 2:30:05 p.m.`. Se
 * parsea a mano porque `new Date()` lee ese formato como mes/día y voltea los dos primeros
 * campos. Solo interesa el día, así que se descarta todo lo que va después de la coma.
 */
function fechaISO(v) {
  const m = String(v ?? "")
    .split(",")[0]
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, año] = m;
  return `${año}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

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
  const iFecha = col("Fecha");
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
    deriva: [],
    revisar: [],
    sinCosto: [],
    mostrador: [],
  };
  /** Filas cuya `Fecha` no se pudo leer: van a `revisar` para no esconderlas. */
  let sinFecha = 0;

  for (const r of rows.slice(1)) {
    const tarifa = r[iTarifa];
    const costo = num(r[iCosto]);
    const margen = costo != null && num(r[iSub]) != null ? num(r[iSub]) - costo : null;
    const impuestos = num(r[iImp]) ?? 0;
    const iso = fechaISO(r[iFecha]);
    const ref = {
      folio: r[iFolio],
      producto: r[iProd],
      tarifa,
      costo,
      margen,
      impuestos,
      fecha: iso ?? "¿?",
    };

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
    if (tarifa === "Proveedor") {
      if (iFee === -1) continue;
      esperado = r[iFee] === "Sí" ? costo * FEE_RATE : 0;
    } else {
      // Membresía, con el nombre que tuviera al exportar. Ver el encabezado.
      esperado = 0;
    }

    const desv = margen - esperado;
    ref.esperado = esperado;
    ref.desv = desv;

    const viejo = iso != null && iso < CORTE;
    if (iso == null) sinFecha++;

    if (Math.abs(desv) <= TOL) cubos.ok.push(ref);
    // Las dos explicaciones benignas solo existen antes del corte. Desde el corte el costo va
    // congelado en la línea y el IVA se cobra bien, así que cualquier desviación —incluso una
    // que imite la firma del IVA— es algo que pasó hoy y hay que mirar.
    else if (!viejo) cubos.revisar.push(ref);
    // Firma del cobro viejo: se cobraba el costo neto como si fuera el total, así que el
    // retorno sale corrido justo el IVA de la línea.
    else if (Math.abs(desv + impuestos) <= TOL) cubos.baseFiscal.push(ref);
    else cubos.deriva.push(ref);
  }

  const validadas =
    cubos.ok.length + cubos.baseFiscal.length + cubos.deriva.length + cubos.revisar.length;
  const money = (n) => n.toFixed(2).padStart(9);
  const n5 = (n) => String(n).padStart(5);

  console.log(`\nArchivo: ${file}`);
  console.log(`Renglones: ${rows.length - 1}\n`);
  console.log(`  Con invariante verificable   ${n5(validadas)}`);
  console.log(`  Mostrador (margen libre)     ${n5(cubos.mostrador.length)}`);
  console.log(`  Sin costo o servicio         ${n5(cubos.sinCosto.length)}`);
  console.log("");
  console.log(`  ✓ Cumplen el invariante      ${n5(cubos.ok.length)}`);
  console.log(`  · IVA de línea               ${n5(cubos.baseFiscal.length)}   antes del ${CORTE}, no se corrige`);
  console.log(`  · Deriva del catálogo        ${n5(cubos.deriva.length)}   antes del ${CORTE}, no se corrige`);
  console.log(`  ⚠ Revisar                    ${n5(cubos.revisar.length)}   desde el ${CORTE}: ya no puede ser deriva`);

  if (sinFecha) {
    console.log(`\n  Aviso: ${sinFecha} renglón(es) con Fecha ilegible; van a "Revisar".`);
  }

  const muestra = (titulo, lista, n = 5) => {
    if (!lista.length) return;
    console.log(`\n${titulo}`);
    for (const x of lista.slice(0, n)) {
      console.log(
        `  ${x.fecha.padEnd(10)} ${x.folio}  ${x.producto.slice(0, 22).padEnd(22)}` +
          ` ${x.tarifa.padEnd(11)} costo ${money(x.costo)}  margen ${money(x.margen)}` +
          `  esperado ${money(x.esperado)}  desv ${money(x.desv)}`
      );
    }
    if (lista.length > n) console.log(`  … y ${lista.length - n} más`);
  };

  // El cubo accionable va primero y completo: es lo único que pide trabajo.
  muestra(
    "⚠ REVISAR — precio tecleado a mano en el carrito, o anomalía real:",
    cubos.revisar,
    cubos.revisar.length
  );
  muestra("Histórico: el precio de proveedor se cobraba sin IVA (ya arreglado):", cubos.baseFiscal);
  muestra("Histórico: el costo del catálogo cambió después de la venta:", cubos.deriva);

  const viejas = cubos.baseFiscal.length + cubos.deriva.length;
  console.log(
    cubos.revisar.length === 0
      ? `\nNada que revisar. ${viejas ? `${viejas} renglón(es) de ruido histórico conocido.` : ""}\n`
      : `\n${cubos.revisar.length} de ${validadas} renglones piden revisión.\n`
  );
  // El exit code solo lo mueve "Revisar": el ruido histórico no baja nunca y dejaría el
  // script en rojo para siempre, que es como se vuelve ruido que nadie mira.
  process.exitCode = cubos.revisar.length === 0 ? 0 : 1;
}

main();
