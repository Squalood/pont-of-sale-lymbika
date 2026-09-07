import { taxRate, type ImpuestoLinea } from "@/lib/pricing";

/**
 * Línea de entrada. `net` es la base sin impuesto y `gross` lo que se cobra. Los dos llegan
 * ya calculados desde pricing.ts: recomputarlos aquí perdería la exactitud del camino
 * normal, donde `gross` es el precio cobrado tal cual.
 *
 * En tarifa de proveedor ambos ya traen el management fee dentro, porque el fee es parte
 * del precio de la línea y no un cargo aparte.
 */
export interface TaxableLine {
  impuesto: ImpuestoLinea;
  net: number;
  gross: number;
}

export interface IvaRow {
  impuesto: ImpuestoLinea;
  /** Base gravable, en centavos. */
  baseCents: number;
  /** Impuesto, en centavos. */
  amountCents: number;
}

export interface IvaBreakdown {
  subtotalCents: number;
  totalCents: number;
  /** Una fila por tasa con importe > 0, ordenadas por tasa ascendente. */
  rows: IvaRow[];
}

const toCents = (n: number) => Math.round(n * 100);

/**
 * Desglose de IVA **cerrado en centavos**: `subtotalCents + Σ rows.amountCents ===
 * totalCents` de forma exacta.
 *
 * Por qué importa: con dos tasas en el mismo carrito, redondear cada fila por separado
 * descuadra el ticket. Con un producto de 149.00 al 8% y otro de 99.00 al 16%, las filas
 * independientes dan 223.31 + 11.04 + 13.66 = 248.01 contra un total de 248.00. El residuo
 * se absorbe en la fila de impuesto más grande para que la columna impresa siempre sume.
 */
export function computeIvaBreakdown(lines: TaxableLine[]): IvaBreakdown {
  const byRate = new Map<ImpuestoLinea, { gross: number; net: number }>();
  let grossTotal = 0;
  let netTotal = 0;

  for (const line of lines) {
    grossTotal += line.gross;
    netTotal += line.net;
    const acc = byRate.get(line.impuesto) ?? { gross: 0, net: 0 };
    acc.gross += line.gross;
    acc.net += line.net;
    byRate.set(line.impuesto, acc);
  }

  const totalCents = toCents(grossTotal);
  let subtotalCents = toCents(netTotal);

  const rows: IvaRow[] = [];
  byRate.forEach((acc, impuesto) => {
    const amountCents = toCents(acc.gross - acc.net);
    // Una línea de precio 0 a tasa 8% no debe imprimir "IVA 8% $0.00".
    if (amountCents <= 0) return;
    rows.push({ impuesto, baseCents: toCents(acc.net), amountCents });
  });

  const residual = totalCents - subtotalCents - rows.reduce((sum, r) => sum + r.amountCents, 0);

  if (residual !== 0) {
    if (rows.length > 0) {
      // A la fila más grande: es donde un centavo es proporcionalmente menos visible.
      const largest = rows.reduce((max, r) => (r.amountCents > max.amountCents ? r : max), rows[0]);
      largest.amountCents += residual;
    } else {
      subtotalCents += residual;
    }
  }

  rows.sort((a, b) => taxRate(a.impuesto) - taxRate(b.impuesto));

  return { subtotalCents, totalCents, rows };
}

/**
 * true si el `managementFee` guardado de una venta **se sumó** al total, en vez de venir
 * dentro del precio de cada línea.
 *
 * Las ventas registradas antes de que el fee entrara al precio cumplen
 * `total = subtotal + iva + fee`, y las nuevas `total = subtotal + iva`. Se distinguen
 * desde lo guardado, así que al reimprimir cada una se reproduce como se cobró y no hace
 * falta un campo nuevo en Strapi.
 */
export function feeSumaAlTotal(
  subtotal: number,
  iva: number,
  total: number,
  managementFee: number
): boolean {
  return managementFee > 0 && Math.abs(total - (subtotal + iva + managementFee)) < 0.011;
}
