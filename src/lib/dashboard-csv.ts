import { downloadCSV } from "@/lib/csv";
import { ventaCardCharged, ventaCardSurcharge } from "@/lib/checkout-math";
import { productImpuesto, SERVICE_IMPUESTO, taxRate } from "@/lib/pricing";
import { feeSumaAlTotal } from "@/lib/tax";
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
/**
 * Rol del management fee en un ticket. Desde que el fee entró al precio de cada línea, el
 * monto guardado ya viene contenido en `subtotal + iva` y NO se suma al total; los tickets
 * anteriores lo traen como cargo aparte. `feeSumaAlTotal` los distingue desde lo guardado,
 * así que el CSV reporta cada época como se cobró sin inventar un campo nuevo.
 *
 * Devuelve "" cuando el ticket no lleva fee, para no ensuciar la columna con un "No" que
 * se leería como si hubiera un fee que no se sumó.
 */
function feeEnPrecio(v: {
  subtotal: number;
  iva: number;
  total: number;
  managementFee?: number;
}): string {
  const fee = v.managementFee ?? 0;
  if (fee <= 0) return "";
  return feeSumaAlTotal(v.subtotal, v.iva, v.total, fee) ? "No" : "Sí";
}

function tarifa(v: { esProveedor?: boolean; esMembresia?: boolean }): string {
  if (v.esProveedor) return "Proveedor";
  if (v.esMembresia) return "Health Pass";
  return "Mostrador";
}

/**
 * Una fila por venta. Es el archivo para cuadrar caja.
 *
 * Cierra exacto, con el management fee decidiendo cuál de las dos identidades aplica —
 * la columna "Fee en el precio" lo dice fila por fila:
 *
 *     Fee en el precio = Sí  →  Subtotal + IVA + Recargo tarjeta = Total
 *     Fee en el precio = No  →  Subtotal + IVA + Management fee + Recargo tarjeta = Total
 *
 * "Sí" es la semántica actual: el 10% va dentro del precio de cada línea, así que ya está
 * contado en subtotal + iva y el monto guardado es informativo. "No" son los tickets
 * anteriores al cambio, donde el fee se sumaba al final. El recargo solo aparece en
 * tickets Health Pass pagados con tarjeta.
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
      // Los componentes van juntos y en orden para que la identidad se lea de corrido, con
      // la bandera pegada al fee que califica.
      "Subtotal",
      "IVA",
      "Management fee",
      "Fee en el precio",
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
        feeEnPrecio(v),
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
 *     Σ Total cobrado = Subtotal + IVA del ticket
 *
 * Vale en las dos épocas del management fee y sin casos especiales, porque `subtotal + iva`
 * siempre es la mercancía y `Σ Total cobrado` siempre es la suma de sus líneas: antes el fee
 * quedaba fuera de ambos, hoy queda dentro de ambos. El recargo de tarjeta nunca entra —
 * es un cargo de la forma de pago, no del precio, y vive solo en `ventas.csv`.
 *
 * `Retorno` contesta "¿qué dejó este renglón?" y su fuente cambia con la tarifa: en
 * Mostrador es el margen de mercancía, en Proveedor es el management fee y en Health Pass es
 * cero por diseño. En Proveedor se reparte el fee del ticket en proporción al total de cada
 * línea, lo que lo hace exacto salvo que el cajero haya tecleado un precio a mano en alguna
 * (esas líneas no llevan fee y el reparto les asigna una parte de todos modos).
 *
 * Solo el de Mostrador arrastra el desajuste de base del costo (ver
 * `docs/pendiente-margen-por-producto.md`); los otros dos son exactos.
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
      // Agrupadas por bloque, y dentro de cada uno en el orden en que se encadena la
      // aritmética, para que las sumas de la guía se lean de corrido sin saltar columnas.
      // De qué ticket viene
      "Fecha",
      "Folio",
      "Método de pago",
      "Tarifa",
      "Fee en el precio",
      // Qué se vendió
      "Producto",
      "Cantidad",
      // Lo que costó. Va antes del cobro para que la cifra que más se busca, el total
      // cobrado, quede al final y pegada al Retorno.
      "Costo unitario",
      "Costo total",
      // Lo que se cobró: precio × cantidad = subtotal, + impuestos = total cobrado.
      // "cobrado" no es adorno: sin él se confunde con "Costo total" al sumar una columna.
      "Precio de venta",
      "Subtotal",
      "Impuestos",
      "Total cobrado",
      // La conclusión
      "Retorno",
    ],
    ventas.flatMap((v) => {
      // El fee es un 10% plano sobre la misma base que suman las líneas, así que repartirlo
      // en proporción al total de cada una da el reparto real. Se prorratea el monto
      // persistido y no un 10% recalculado, para que la suma de la columna cuadre con lo
      // que de verdad se cobró incluso si alguna línea llevaba precio tecleado a mano.
      const baseTicket = (v.venta ?? []).reduce((sum, i) => sum + i.totalLine, 0);
      const feeTicket = v.managementFee ?? 0;
      const tarifaTicket = tarifa(v);
      const feeEnPrecioTicket = feeEnPrecio(v);

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
        // Parte de `total` que es fee. No sale como columna propia: en Proveedor es el
        // Retorno, y en las demás tarifas siempre sería cero.
        const feeLinea = baseTicket > 0 ? feeTicket * (total / baseTicket) : 0;

        // Qué dejó este renglón. La fuente del retorno depende de la tarifa, porque en dos
        // de las tres el precio de venta se deriva del mismo `priceMember` que el reporte
        // usa como costo: restar ahí no mide el negocio, solo devuelve la tarifa.
        //   Mostrador   → el margen de mercancía, única tarifa con precio propio
        //   Proveedor   → el management fee, que es el retorno de esa venta y es exacto
        //   Health Pass → cero por diseño: se vende al precio de proveedor
        const retorno =
          tarifaTicket === "Health Pass"
            ? 0
            : tarifaTicket === "Proveedor"
              ? feeLinea
              : costoTotal != null
                ? subtotal - costoTotal
                // Sin costo capturado no hay retorno que reportar: vacío, no cero, que se
                // leería como una venta que no dejó nada.
                : null;

        return [
          fecha(v.fecha),
          folio(v.id),
          v.metodoPago,
          tarifaTicket,
          feeEnPrecioTicket,
          item.productName,
          item.quantity,
          costoUnitario != null ? costoUnitario.toFixed(2) : "",
          costoTotal != null ? costoTotal.toFixed(2) : "",
          precioVenta.toFixed(2),
          subtotal.toFixed(2),
          impuestos.toFixed(2),
          total.toFixed(2),
          retorno != null ? retorno.toFixed(2) : "",
        ];
      });
    })
  );
}

/** Tasas de IVA presentes en una compra, o "No" si ninguna se capturó. */
function ivaRegistrado(items: { iva?: string }[]): string {
  const tasas = new Set<string>();
  for (const i of items) {
    if (i.iva === "iva8") tasas.add("8%");
    else if (i.iva === "iva16") tasas.add("16%");
  }
  return tasas.size ? Array.from(tasas).sort().join(" + ") : "No";
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
      // Sin tasa capturada el total de la compra es el crudo tecleado, así que no sirve
      // para contrastarlo contra la factura del proveedor.
      "IVA registrado",
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
        ivaRegistrado(items),
        c.archivo?.name ?? "",
        c.notas ?? "",
      ];
    })
  );
}
