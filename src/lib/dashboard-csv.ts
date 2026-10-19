import { downloadCSV } from "@/lib/csv";
import { ventaCardCharged, ventaCardSurcharge } from "@/lib/checkout-math";
import { productImpuesto, SERVICE_IMPUESTO, taxRate } from "@/lib/pricing";
import { feeSumaAlTotal } from "@/lib/tax";
import type { CompraItemType, CompraType } from "@/types/compra";
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
 * El costo y la tasa salen de los snapshots `unitCost` e `impuesto` que la venta graba al
 * cobrar, y solo se cae al catálogo cuando la venta no los trae —o sea en las ventas previas
 * a que existieran esos campos. Esa es la única fuente de imprecisión que queda, y es
 * histórica: confirmar una compra sobrescribe `priceMember` e `impuesto` del producto, así
 * que leerlos hoy reescribía el costo y el IVA de todas sus ventas pasadas.
 *
 * El costo y el precio se copian del MISMO objeto `item.product` en el MISMO instante del
 * checkout. Por eso `Retorno = 0` en Health Pass deja de ser coincidencia y pasa a ser un
 * invariante estructural, que es lo que hace válido a `scripts/validar-margen.mjs`.
 *
 * Lo que el snapshot NO arregla: congela lo que el catálogo decía ese día, no lo que costó la
 * pieza concreta. Dos líneas de lotes distintos del mismo producto guardan el mismo costo.
 *
 * `Total` es exacto siempre: es el `totalLine` que quedó grabado en la venta. En servicios
 * `Costo unitario` va vacío, porque no tienen costo de proveedor.
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
 * `Retorno` es `Subtotal − Costo total`, sin casos por tarifa: los dos vienen sin impuesto,
 * así que la resta mide el negocio. Health Pass cae en 0 y Proveedor en el 10 % del fee por
 * la tarifa misma, no porque el reporte lo imponga — si alguno se sale de ahí, es una señal
 * real y no un artefacto.
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
      const tarifaTicket = tarifa(v);
      const feeEnPrecioTicket = feeEnPrecio(v);

      return (v.venta ?? []).map((item) => {
        const product = item.product ? productsById.get(item.product.id) : undefined;

        // La tasa que quedó grabada en la venta. Solo las ventas previas al snapshot caen al
        // catálogo, que devuelve la tasa de hoy y no la del día del cobro.
        const rate =
          item.tax != null
            ? taxRate(item.tax)
            : item.type === "service"
              ? taxRate(SERVICE_IMPUESTO)
              : product
                ? taxRate(productImpuesto(product))
                : 0;

        const total = item.totalLine;
        const subtotal = total / (1 + rate);
        const impuestos = total - subtotal;
        const precioVenta = item.quantity > 0 ? subtotal / item.quantity : 0;

        // El costo grabado en la venta. Igual que la tasa, solo las ventas previas al
        // snapshot caen al catálogo y arrastran su deriva.
        const costoUnitario = item.unitCost ?? product?.priceMember ?? null;
        const costoTotal = costoUnitario != null ? costoUnitario * item.quantity : null;
        // Qué dejó este renglón: una sola resta, sin casos por tarifa. Subtotal y Costo
        // total están los dos sin impuesto, así que la resta mide el negocio de verdad —
        // y cada tarifa cae donde debe sin que el reporte lo imponga:
        //   Mostrador   → el margen real
        //   Health Pass → 0, porque se vende al costo de proveedor
        //   Proveedor   → el 10 % del fee, que va dentro del precio
        // Si alguna se sale de ahí, es una señal que hay que ver, no un artefacto.
        //
        // Sin costo capturado se deja vacío, no en cero: un cero se leería como una venta
        // que no dejó nada.
        const retorno = costoTotal != null ? subtotal - costoTotal : null;

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

/** Etiqueta de la tasa de una línea de compra. Vocabulario propio: usa `exento`, no `iva0`. */
function ivaCompraLabel(iva?: CompraItemType["iva"]): string {
  if (iva === "iva8") return "IVA 8%";
  if (iva === "iva16") return "IVA 16%";
  if (iva === "exento") return "Exento";
  // Compras anteriores a que se capturara la tasa: el total es el crudo tecleado.
  return "";
}

/**
 * Una fila por renglón de compra. Es a `compras.csv` lo que `ventas-por-producto` es a
 * `ventas`: la misma información vista a la altura de la mercancía en vez del documento.
 *
 * Una fila es un **renglón**, no un producto: el mismo artículo comprado en dos lotes son
 * dos filas, con su lote y su caducidad. Ahí está el valor que el resumen no puede dar —
 * es la única vista donde se ve a qué precio entró cada lote, que es justo lo que hace
 * falta para cuadrar contra la factura del proveedor concepto por concepto.
 *
 * La identidad que debe cerrar, por folio:
 *
 *     Σ Total línea = Total de la compra en `compras.csv`
 *
 * Cierra exacta y no por suerte: `loteTotalLine` redondea importe e impuesto a centavos
 * **por renglón** antes de sumar, igual que el CFDI del proveedor, y `compra.total` es esa
 * misma suma. Por eso el IVA de la fila se deriva restando (`Total línea − Importe`) en vez
 * de recalcular `importe × tasa`: así la fila cierra aunque el dato guardado sea raro.
 */
export function exportComprasPorProductoCSV(compras: CompraType[], naming: CsvNaming): void {
  // Igual que el resumen: las compras no se acotan por sucursal y el nombre lo dice.
  const alcance = naming.sucursal ? "_todas-las-farmacias" : "";

  downloadCSV(
    `compras-por-producto_${naming.stamp}${alcance}${operadorSuffix(naming)}.csv`,
    [
      // De qué compra viene. Se repiten en cada renglón del mismo folio.
      "Fecha",
      "Folio",
      "Proveedor",
      "Operador",
      // Qué entró
      "Producto",
      "Cantidad",
      "Lote",
      "Caducidad",
      // Lo que costó: costo × cantidad = importe, + IVA = total de la línea.
      "Costo unitario",
      "Importe",
      "Tasa IVA",
      "IVA",
      "Total línea",
    ],
    compras.flatMap((c) =>
      (c.items ?? []).map((item) => {
        const importe = Math.round(item.quantity * item.costoUnitario * 100) / 100;
        const iva = Math.round((item.totalLine - importe) * 100) / 100;
        return [
          fecha(c.fecha),
          folio(c.id),
          c.proveedor?.name ?? "",
          c.operador ?? "",
          // El nombre guardado en la línea, no el del catálogo: si el producto se renombró
          // después, la compra sigue diciendo con qué nombre entró.
          item.productName,
          item.quantity,
          item.numeroLote ?? "",
          item.fechaCaducidad ?? "",
          item.costoUnitario.toFixed(2),
          importe.toFixed(2),
          ivaCompraLabel(item.iva),
          iva.toFixed(2),
          item.totalLine.toFixed(2),
        ];
      })
    )
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
