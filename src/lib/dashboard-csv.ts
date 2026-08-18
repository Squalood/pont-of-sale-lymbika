import { downloadCSV } from "@/lib/csv";
import { ventaCardCharged, ventaCardSurcharge } from "@/lib/checkout-math";
import { productImpuesto, SERVICE_IMPUESTO, taxRate } from "@/lib/pricing";
import type { CompraType } from "@/types/compra";
import type { ProductType } from "@/types/product";
import type { VentaType } from "@/types/venta";

/** Contexto para nombrar el archivo: refleja los filtros activos al descargar. */
export interface CsvNaming {
  /** Rango de fechas ya formateado por `csvStamp`. */
  stamp: string;
  /** Nombre de la sucursal, si el filtro está acotado. */
  sucursal?: string;
  /** Nombre del operador, si el filtro está acotado. */
  operador?: string;
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function operadorSuffix({ operador }: CsvNaming): string {
  return operador ? `_${slug(operador)}` : "";
}

const folio = (id: number) => String(id).padStart(5, "0");
const fecha = (iso: string) => new Date(iso).toLocaleString("es-MX");

/** Una fila por venta. Es el archivo para cuadrar caja. */
export function exportVentasCSV(ventas: VentaType[], naming: CsvNaming): void {
  const sucursal = naming.sucursal ? `_${slug(naming.sucursal)}` : "";

  downloadCSV(
    `ventas_${naming.stamp}${sucursal}${operadorSuffix(naming)}.csv`,
    [
      "Fecha",
      "Folio",
      "Farmacia",
      "Operador",
      "Método de pago",
      "Subtotal",
      "IVA",
      "Total",
      "Efectivo MXN",
      "Efectivo USD",
      "Tipo de cambio",
      "Tarjeta cobrada",
      "Recargo tarjeta",
      "Transferencia",
      "Membresía",
      "Artículos",
      "Nota",
    ],
    ventas.map((v) => {
      const usd = v.recibidoUSD ?? 0;
      const tc = v.tipoCambioUsado ?? 1;
      // Mismas ramas que `accumulatePago`, para que las sumas del CSV cuadren con la
      // gráfica de métodos de pago.
      const efectivoMXN =
        v.metodoPago === "efectivo" || v.metodoPago === "mixto"
          ? (v.recibido ?? 0) - usd * tc - (v.cambio ?? 0)
          : 0;
      const transferencia =
        v.metodoPago === "mixto"
          ? (v.montoTransferencia ?? 0)
          : v.metodoPago === "transfe"
            ? v.total
            : 0;
      const tarjeta =
        v.metodoPago === "tarjeta" || v.metodoPago === "mixto" ? ventaCardCharged(v) : 0;

      return [
        fecha(v.fecha),
        folio(v.id),
        v.pharmacies?.[0]?.nombre ?? "",
        v.operador,
        v.metodoPago,
        v.subtotal.toFixed(2),
        v.iva.toFixed(2),
        v.total.toFixed(2),
        efectivoMXN.toFixed(2),
        usd.toFixed(2),
        tc.toFixed(2),
        tarjeta.toFixed(2),
        ventaCardSurcharge(v).toFixed(2),
        transferencia.toFixed(2),
        v.esMembresia ? "Sí" : "No",
        (v.venta ?? []).reduce((s, i) => s + i.quantity, 0),
        v.nota ?? "",
      ];
    })
  );
}

/**
 * Una fila por línea de producto/servicio, a diferencia de `ventas.csv` que es una fila
 * por venta.
 *
 * Dos columnas son aproximadas y no un dato histórico exacto, porque el backend no las
 * persiste por línea (ver el commit que metió el IVA editable por artículo: "el impuesto
 * por línea no se persiste"):
 *  - Costo proveedor: el `priceMember` ACTUAL del producto en el catálogo. Es el mismo
 *    campo que se sobrescribe con el costo real al registrar una compra (ver
 *    new-purchase-dialog.tsx), así que es el mejor costo disponible, pero una venta vieja
 *    puede haber costado distinto si hubo compras después.
 *  - IVA cobrado: se recalcula con la tasa ACTUAL del producto (`impuesto`), no la vigente
 *    el día de la venta. El cajero también puede corregir la tasa por línea desde el chip
 *    de IVA en el cobro, y esa corrección no se guarda, así que esta columna puede no
 *    coincidir centavo a centavo con el ticket original.
 *
 * "Precio pagado" sí es exacto: es el `unitPrice` que quedó grabado en la venta.
 */
export function exportVentasDetalleCSV(
  ventas: VentaType[],
  productsById: Map<number, ProductType>,
  naming: CsvNaming
): void {
  const sucursal = naming.sucursal ? `_${slug(naming.sucursal)}` : "";

  downloadCSV(
    `ventas-detalle_${naming.stamp}${sucursal}${operadorSuffix(naming)}.csv`,
    [
      "Fecha",
      "Folio",
      "Producto",
      "Cantidad",
      "Costo proveedor (unitario)",
      "Costo proveedor (total)",
      "Precio pagado (unitario)",
      "Precio pagado (total)",
      "IVA cobrado",
    ],
    ventas.flatMap((v) =>
      (v.venta ?? []).map((item) => {
        const product = item.product ? productsById.get(item.product.id) : undefined;
        const costoUnitario = product?.priceMember ?? null;

        const rate =
          item.type === "service"
            ? taxRate(SERVICE_IMPUESTO)
            : product
              ? taxRate(productImpuesto(product))
              : 0;
        // unitPrice ya incluye el IVA (es lo que se cobró), así que se despeja hacia
        // atrás: iva = total − total / (1 + tasa).
        const ivaLinea = rate > 0 ? item.totalLine - item.totalLine / (1 + rate) : 0;

        return [
          fecha(v.fecha),
          folio(v.id),
          item.productName,
          item.quantity,
          costoUnitario != null ? costoUnitario.toFixed(2) : "",
          costoUnitario != null ? (costoUnitario * item.quantity).toFixed(2) : "",
          item.unitPrice.toFixed(2),
          item.totalLine.toFixed(2),
          ivaLinea.toFixed(2),
        ];
      })
    )
  );
}

/** Una fila por compra. Incluye las de total 0, marcadas, para poder reconciliar. */
export function exportComprasCSV(compras: CompraType[], naming: CsvNaming): void {
  // Las compras no se acotan por sucursal, así que el nombre lo dice en vez de mentir
  // con el nombre de la sucursal filtrada.
  const alcance = naming.sucursal ? "_todas-las-farmacias" : "";

  downloadCSV(
    `compras_${naming.stamp}${alcance}${operadorSuffix(naming)}.csv`,
    [
      "Fecha",
      "Folio",
      "Proveedor",
      "Operador",
      "Total",
      "Productos",
      "Unidades",
      "Costos registrados",
      "Factura adjunta",
      "Notas",
    ],
    compras.map((c) => {
      const items = c.items ?? [];
      return [
        fecha(c.fecha),
        folio(c.id),
        c.proveedor?.name ?? "",
        c.operador ?? "",
        c.total.toFixed(2),
        new Set(items.map((i) => i.product?.documentId ?? i.productName)).size,
        items.reduce((s, i) => s + i.quantity, 0),
        c.total > 0 ? "Sí" : "No",
        c.archivo?.name ?? "",
        c.notas ?? "",
      ];
    })
  );
}
