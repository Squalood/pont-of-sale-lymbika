import { authFetch } from "@/lib/auth";
import { ventaCardCharged } from "@/lib/checkout-math";

export interface ProductoResumen {
  nombre: string;
  cantidad: number;
  total: number;
}

export interface PagosResumen {
  efectivoMXN: number;
  efectivoUSD: number;
  tarjeta: number;
  transferencia: number;
  numVentas: number;
  totalImporte: number;
}

export interface ReporteCierreData {
  pagos: PagosResumen;
  productos: ProductoResumen[];
}

/** Las ventas de una caja: de su apertura a su cierre (sin `hasta`, hasta ahora). */
export async function fetchReporteCierre(pharmacyId: string, desde: string, hasta?: string | null): Promise<ReporteCierreData> {
  const fechaDesde = new Date(desde).toISOString();
  const fechaHastaFilter = hasta ? `&filters[fecha][$lte]=${new Date(hasta).toISOString()}` : "";

  const url =
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ventas-pos` +
    `?filters[fecha][$gte]=${fechaDesde}` +
    fechaHastaFilter +
    `&filters[pharmacies][documentId][$eq]=${pharmacyId}` +
    `&populate=*` +
    `&pagination[pageSize]=5000`;

  const res = await authFetch(url);
  if (!res.ok) throw new Error(`Error al obtener ventas (${res.status})`);

  const json = await res.json();
  type VentaRow = {
    total: number;
    metodoPago: string;
    montoTarjeta?: number;
    montoTransferencia?: number;
    recargoTarjeta?: number;
    esMembresia?: boolean;
    recibido?: number;
    cambio?: number;
    recibidoUSD?: number;
    tipoCambioUsado?: number;
    venta?: { productName: string; quantity: number; unitPrice: number }[];
  };

  const ventas: VentaRow[] = json.data ?? [];

  const pagos: PagosResumen = {
    efectivoMXN: 0,
    efectivoUSD: 0,
    tarjeta: 0,
    transferencia: 0,
    numVentas: ventas.length,
    totalImporte: 0,
  };

  const productMap = new Map<string, { cantidad: number; total: number }>();

  for (const v of ventas) {
    pagos.totalImporte += v.total;

    const usd = v.recibidoUSD ?? 0;
    const tc = v.tipoCambioUsado ?? 1;

    if (v.metodoPago === "efectivo" || v.metodoPago === "mixto") {
      const recibidoMXN = (v.recibido ?? 0) - usd * tc;
      pagos.efectivoMXN += recibidoMXN - (v.cambio ?? 0);
      pagos.efectivoUSD += usd;
    }
    // La terminal cobra base + recargo, así que el cuadre suma ambos. Antes la rama
    // `mixto` sumaba solo la base y el corte salía corto en ventas con membresía.
    if (v.metodoPago === "tarjeta" || v.metodoPago === "mixto") {
      pagos.tarjeta += ventaCardCharged(v);
    }
    if (v.metodoPago === "mixto") {
      pagos.transferencia += v.montoTransferencia ?? 0;
    }
    if (v.metodoPago === "transfe") {
      pagos.transferencia += v.total;
    }

    for (const item of v.venta ?? []) {
      if (!item.productName) continue;
      const entry = productMap.get(item.productName) ?? { cantidad: 0, total: 0 };
      entry.cantidad += item.quantity;
      entry.total += item.quantity * item.unitPrice;
      productMap.set(item.productName, entry);
    }
  }

  const productos: ProductoResumen[] = Array.from(productMap.entries())
    .map(([nombre, { cantidad, total }]) => ({ nombre, cantidad, total }))
    .sort((a, b) => b.total - a.total);

  return { pagos, productos };
}
