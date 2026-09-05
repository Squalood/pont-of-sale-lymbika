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

/**
 * Tarifa con la que se cotizó el ticket. Una sola columna y no dos banderas porque son
 * excluyentes por construcción: `PriceMode` es un valor, no tres flags, así que Health Pass
 * y Precio de proveedor no pueden estar activos a la vez.
 *
 * Las ventas anteriores a estos campos no traen ninguno y caen en "Mostrador", que es la
 * lectura correcta: antes de que existiera la tarifa, todo se cobraba a precio de lista.
 */
function tarifa(v: { esProveedor?: boolean; esMembresia?: boolean }): string {
  if (v.esProveedor) return "Proveedor";
  if (v.esMembresia) return "Health Pass";
  return "Mostrador";
}

/**
 * Una fila por venta. Es el archivo para cuadrar caja.
 *
 * Cierra exacto por construcción: Subtotal + IVA + Management fee + Recargo tarjeta = Total.
 * El management fee solo aparece en tickets de tarifa Proveedor (10% sobre la mercancía) y
 * el recargo solo en tickets Health Pass pagados con tarjeta.
 */
export function exportVentasCSV(ventas: VentaType[], naming: CsvNaming): void {
  const sucursal = naming.sucursal ? `_${slug(naming.sucursal)}` : "";

  downloadCSV(
    `ventas_${naming.stamp}${sucursal}${operadorSuffix(naming)}.csv`,
    [
      "Fecha",
      "Folio",
      "Farmacia",
      "Operador",
      "Tarifa",
      "Método de pago",
      // Los cuatro componentes van juntos y en orden para que se lea la identidad que el
      // sistema garantiza: Subtotal + IVA + Management fee + Recargo tarjeta = Total.
      "Subtotal",
      "IVA",
      "Management fee",
      "Recargo tarjeta",
      "Total",
      "Efectivo MXN",
      "Efectivo USD",
      "Tipo de cambio",
      "Tarjeta cobrada",
      "Transferencia",
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
        tarifa(v),
        v.metodoPago,
        v.subtotal.toFixed(2),
        v.iva.toFixed(2),
        (v.managementFee ?? 0).toFixed(2),
        ventaCardSurcharge(v).toFixed(2),
        v.total.toFixed(2),
        efectivoMXN.toFixed(2),
        usd.toFixed(2),
        tc.toFixed(2),
        tarjeta.toFixed(2),
        transferencia.toFixed(2),
        (v.venta ?? []).reduce((s, i) => s + i.quantity, 0),
        v.nota ?? "",
      ];
    })
  );
}

/**
 * Una fila por producto/servicio vendido, a diferencia de `ventas.csv`, que lleva una fila
 * por ticket. Se relacionan por la columna `Folio`.
 *
 * Bases de impuesto — el punto delicado del archivo. El precio guardado en la venta
 * (`unitPrice`) YA INCLUYE el IVA, así que las columnas netas se despejan hacia atrás desde
 * `totalLine` en vez de multiplicar el precio por la cantidad. De lo contrario `Subtotal`
 * saldría con el impuesto dentro y `Subtotal + Impuestos` cobraría el IVA dos veces, que es
 * justo el error que ya se corrigió en el cobro. El invariante que sostiene el archivo es:
 *
 *     Subtotal + Impuestos = Total = lo que pagó el cliente
 *
 * `Costo unitario` en cambio se guarda SIN IVA (la compra aplica el multiplicador aparte,
 * ver purchase/helpers.ts), así que el margen se calcula contra `Subtotal` y nunca contra
 * `Total`: son bases distintas.
 *
 * Dos columnas son aproximadas y no un dato histórico exacto, porque el backend no las
 * persiste por línea (ver el commit que metió el IVA editable por artículo: "el impuesto
 * por línea no se persiste"):
 *  - Costo unitario: el `priceMember` ACTUAL del producto. Es el mismo campo que se
 *    sobrescribe con el costo real al registrar una compra (ver new-purchase-dialog.tsx),
 *    así que es el mejor costo disponible, pero una venta vieja pudo costar distinto si
 *    hubo compras después. Va vacío en servicios, que no tienen costo.
 *  - Impuestos: se recalcula con la tasa ACTUAL del producto (`impuesto`), no la vigente el
 *    día de la venta. El cajero puede corregir la tasa por línea desde el chip de IVA y esa
 *    corrección no se guarda, así que puede no coincidir centavo a centavo con el ticket.
 *
 * `Total` sí es exacto: es el `totalLine` que quedó grabado en la venta.
 *
 * Qué suma contra `ventas.csv`, para el mismo folio:
 *
 *     Σ Total + Σ Management fee = Total del ticket − Recargo tarjeta
 *
 * El recargo se queda fuera a propósito: es un cargo de la forma de pago, no del precio de
 * la mercancía, y vive en `ventas.csv`. El management fee sí entra porque es parte de lo
 * que cuesta la tarifa de proveedor.
 *
 * `Margen` es solo de mercancía (Subtotal − Costo total) y no incluye el fee, que va en su
 * propia columna: quien quiera la contribución total suma las dos.
 */
export function exportVentasPorProductoCSV(
  ventas: VentaType[],
  productsById: Map<number, ProductType>,
  naming: CsvNaming
): void {
  const sucursal = naming.sucursal ? `_${slug(naming.sucursal)}` : "";

  downloadCSV(
    `ventas-por-producto_${naming.stamp}${sucursal}${operadorSuffix(naming)}.csv`,
    [
      "Fecha",
      "Folio",
      "Método de pago",
      "Tarifa",
      "Producto",
      "Cantidad",
      "Precio de venta",
      "Costo unitario",
      "Costo total",
      "Subtotal",
      "Impuestos",
      "Total",
      "Management fee",
      "Margen",
    ],
    ventas.flatMap((v) => {
      // El fee es un 10% plano sobre la misma base que suman las líneas, así que repartirlo
      // en proporción al total de cada una es exacto, no una estimación. Se prorratea el
      // monto persistido y no un 10% recalculado, para respetar lo que de verdad se cobró.
      const baseTicket = (v.venta ?? []).reduce((sum, i) => sum + i.totalLine, 0);
      const feeTicket = v.managementFee ?? 0;
      const tarifaTicket = tarifa(v);

      return (v.venta ?? []).map((item) => {
        const product = item.product ? productsById.get(item.product.id) : undefined;

        const rate =
          item.type === "service"
            ? taxRate(SERVICE_IMPUESTO)
            : product
              ? taxRate(productImpuesto(product))
              : 0;

        const total = item.totalLine;
        const subtotal = total / (1 + rate);
        const impuestos = total - subtotal;
        const precioVenta = item.quantity > 0 ? subtotal / item.quantity : 0;

        const costoUnitario = product?.priceMember ?? null;
        const costoTotal = costoUnitario != null ? costoUnitario * item.quantity : null;
        // Sin costo no hay margen que reportar: dejarlo vacío en vez de igualarlo al
        // subtotal, que se leería como una utilidad del 100%.
        const margen = costoTotal != null ? subtotal - costoTotal : null;

        const feeLinea = baseTicket > 0 ? feeTicket * (total / baseTicket) : 0;

        return [
          fecha(v.fecha),
          folio(v.id),
          v.metodoPago,
          tarifaTicket,
          item.productName,
          item.quantity,
          precioVenta.toFixed(2),
          costoUnitario != null ? costoUnitario.toFixed(2) : "",
          costoTotal != null ? costoTotal.toFixed(2) : "",
          subtotal.toFixed(2),
          impuestos.toFixed(2),
          total.toFixed(2),
          feeLinea.toFixed(2),
          margen != null ? margen.toFixed(2) : "",
        ];
      });
    })
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
