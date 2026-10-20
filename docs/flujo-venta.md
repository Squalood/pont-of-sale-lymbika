# Flujo de venta de un producto y descuento de stock

Documento del flujo **actual** de cómo se vende un producto en el POS y cómo se mueve el stock:
por farmacia, con lotes, y siempre a través del backend.

---

## 1. Resumen

- El stock se lleva **por ubicación**: la **bodega central** y cada **farmacia**.
- Toda escritura de stock (venta, devolución, compra, traspaso, merma, corrección, conteo) la
  hace el **backend** en endpoints propios (`/api/pos-stock/*`), dentro de una **transacción**
  con las filas bloqueadas. El POS nunca calcula ni sobrescribe un valor de stock: manda el
  documento (la venta, la compra…) o la diferencia, y aplica los niveles que el servidor le
  devuelve.
- Cada operación queda en una bitácora con llave única, así que **reintentar no descuenta dos
  veces**.
- La venta descuenta de **la farmacia de la caja** y de sus **lotes**. Si no alcanza, se
  permite: la farmacia queda en negativo y se avisa.

---

## 2. Modelo de stock

| Qué | Dónde vive (Strapi) |
|---|---|
| **Total** del producto (todas las ubicaciones) | `product.stock_central` |
| **Stock de cada farmacia** | colección `pharmacy-stock`: una fila por producto y farmacia (`pairKey` único) |
| **Bodega central** | **no se guarda**: se calcula como `total − Σ farmacias` |
| **Lotes** | colección `inventory-lot`; `pharmacy` indica dónde está (vacío = bodega) |
| **Bitácora** | colección `stock-operation`: una fila por operación, con sus movimientos |
| **Traspasos** | colección `stock-transfer`: una fila por porción de lote movida, agrupadas por `batchId` |

Reglas:

- Un movimiento en una ubicación (venta, compra, devolución, merma, corrección) cambia esa
  ubicación **y el total**.
- Un **traspaso** resta del origen y suma al destino: **el total no cambia**. Los lotes viajan
  con la mercancía; un traspaso parcial parte el lote en dos registros con el mismo número y
  caducidad (`source_lot` apunta al original).
- En cada ubicación, lo ideal es `stock = Σ lotes activos`. La diferencia es mercancía
  "sin lote" y se ve en **Stock por farmacia** (columna *Sin lote* y vista *Descuadres*).

El núcleo está en el backend: `backend-ecommerce/src/api/pos-stock/services/stock-core.ts`.

---

## 3. Carga del catálogo en la caja

- Hook: [`useGetProducts`](../src/api/getProducts.ts), con `fields` y `populate` explícitos
  (hasta 5000 productos). Ver [optimización del catálogo](optimizacion-catalogo.md).
- La caja lo pide **filtrado a la farmacia de la caja abierta** (`caja.pharmacy`):
  - `pharmacy_stocks` → el stock de esa farmacia (0 o 1 fila; sin fila = 0).
  - `inventory_lots` → **solo** los lotes de esa farmacia.
- Sin farmacia (pantallas de admin) el catálogo representa el **total**: `stock_central` y los
  lotes de todas las ubicaciones.
- [`localStock`](../src/lib/stock.ts) decide qué número se muestra y se vende. La tarjeta del
  producto ([product-card.tsx](../src/components/product-card.tsx)) marca *"sin stock en esta
  farmacia"* o *"bajo mínimo"* (`pharmacy-stock.min_stock`).
- En [`page.tsx`](../src/app/page.tsx) el catálogo se copia a un state local `products`, que
  [`useMultiCart`](../src/hooks/useMultiCart.ts) actualiza tras cada venta con los niveles que
  devuelve el servidor.

---

## 4. Armado del carrito

- El POS soporta **hasta 4 carritos simultáneos** (`MAX_CARTS`) vía
  [`useMultiCart`](../src/hooks/useMultiCart.ts). Se guardan en `sessionStorage` y sobreviven
  al cambiar de página.
- Un `CartItem` puede ser `product` o `service` ([product.ts](../src/types/product.ts)). Solo
  los de tipo `product` mueven stock.
- Se agrega haciendo click en la grilla o escaneando el código de barras. Al agregar:
  - si la farmacia no tiene stock, sale un **aviso** y se agrega igual;
  - **lote**: 0 lotes vendibles → sin lote; 1 → se toma solo; varios → selector
    ([lote-selector-dialog.tsx](../src/components/lote-selector-dialog.tsx)), ordenados por
    caducidad. Vendible = `activo`, con existencia y no vencido.
- La cantidad se cambia con − / + o **escribiéndola** en la línea. **No hay tope**: si la línea
  pide más de lo que tiene su lote o la farmacia, la línea lo avisa en ámbar y al cobrar el
  servidor completa con otros lotes o sin lote.
- Cada carrito tiene una **tarifa** (`priceMode`): `regular`, `member` (la membresía; su nombre comercial sale de
  `site-config.membershipName` en Strapi) o
  `proveedor` ([pricing.ts](../src/lib/pricing.ts)). Es un solo valor, así que los dos
  switches del panel no pueden quedar encendidos a la vez.
- El precio de lista de la línea sale de esta prelación:
  1. `overridePrice` si el cajero editó el precio manualmente, si no
  2. `priceMember` si la tarifa es `member` o `proveedor`, si no
  3. `price` regular.

  Sobre ese precio de lista actúa después el impuesto de la línea (ver 4.1).
- La tarifa `proveedor` aplica un **management fee del 10% dentro del precio de cada
  línea**: el precio cobrado es `priceMember × 1.10` ([pricing.ts](../src/lib/pricing.ts)).
  No hay switch aparte para el fee ni fila de cargo al final del carrito — es consecuencia
  de la tarifa y ya está aplicado por producto.
  - Aplica también a los servicios, y **no** a las líneas con precio tecleado a mano: un
    precio escrito por el cajero es final.
  - Como el precio incluye IVA, el fee **carga el impuesto de su propia línea**. Un
    cosmético al 16% declara 10% más de IVA que su precio sin fee. Es la consecuencia
    directa de meter el fee al precio, y es más coherente que dejarlo a tasa 0.
  - `managementFee` se sigue guardando en la venta, pero es **informativo**: ya está
    contenido en `subtotal + iva`, no se suma. Es la porción del precio cobrado que
    corresponde al fee, con impuesto incluido.

---

## 4.1. IVA por línea

**Todo precio de catálogo viene sin impuesto** — `price`, `priceMember` y la tarifa de un
servicio— así que el precio de lista ya *es* la base y no hay nada que despejar. La tasa
efectiva se le suma encima:

```
cobra = precioLista × (1 + tasa(tasa efectiva de la línea))
```

Un producto de $100 marcado `iva8` se cobra así:

| Corregido a | Cobra |
|---|---|
| `iva0` | 100.00 |
| `iva8` (sin tocar) | 108.00 |
| `iva16` | 116.00 |

Una sola multiplicación, sin casos por tipo de línea ni por tarifa
([`itemUnitPrice`](../src/lib/pricing.ts)).

> **Esto cambió el 2026-10-05.** Antes `price` se leía como precio de anaquel, con el IVA
> dentro, y el cobro lo despejaba. La farmacia no tiene anaquel con precios —solo los ve el
> cajero— así que no había una cifra que el cobro tuviera que respetar al centavo, y la base
> única salió más simple: el cambio borró `impuestoIncluido` y `listPriceIncluyeImpuesto`.
> Las pantallas que listan catálogo muestran el precio con la tasa ya aplicada
> ([`productPriceConImpuesto`](../src/lib/pricing.ts)) para que coincidan con el carrito.

- La tasa efectiva sale de [`itemImpuesto`](../src/lib/pricing.ts): corrección del cajero,
  si no la del producto ([`productImpuesto`](../src/lib/pricing.ts)).
- `productImpuesto` es la tasa marcada en el catálogo, así que **nunca** mira la
  corrección. Lee `product.impuesto` y nada más: **el backend es la única autoridad**, no
  hay inferencia por categoría. Un producto sin el campo capturado se cobra sin IVA; se
  corrige en Strapi, o con el chip si es solo para esa venta.
- Un precio editado a mano gana sobre todo: es lo que paga el cliente, y de ahí se extrae
  la base con la tasa efectiva.
- Los **servicios médicos** son siempre **8%**, fijo y no editable
  ([`SERVICE_IMPUESTO`](../src/lib/pricing.ts)), porque el backend no manda impuesto para
  las tarifas. La tarifa viene neta igual que el precio de un producto: una consulta de
  $200 se cobra en $216.
- El cajero corrige la tasa desde el chip de cada línea
  ([tax-chip.tsx](../src/components/cart/tax-chip.tsx)). La corrección **sí se guarda**, en
  el campo `tax` de la línea de venta, junto al `unitCost`. Por eso el reporte por producto
  puede desglosar la tasa que de verdad se cobró y no la que el catálogo diga hoy. El ticket
  de la venta viva imprime una fila por tasa; una reimpresión desde el admin imprime una
  sola fila `IVA incluido` con el agregado de `venta.iva`.

### Regla de redondeo

[`computeIvaBreakdown`](../src/lib/tax.ts) devuelve los importes **cerrados en centavos**:
`subtotal + Σ filas de IVA === total`, exacto. Es necesario porque con dos tasas en
el mismo carrito, redondear cada fila por separado descuadra el ticket — con 149.00 al 8%
y 99.00 al 16% las filas independientes suman 248.01 contra un total de 248.00. El residuo
se absorbe en la fila de impuesto más grande. Carrito, ticket y detalle de venta renderizan
del mismo conjunto cerrado, así no pueden contradecirse entre sí.

> El selector general de IVA 0/8/16 del carrito **se eliminó**. El impuesto es por
> artículo, no por carrito. Además calculaba `manualIva` sobre una base que ya incluía
> IVA, así que un suplemento en un carrito con el selector en 16% pagaba IVA dos veces.

---

## 5. Checkout / confirmación de pago

El botón de cobrar abre `CheckoutDialog`. Al confirmar se ejecuta
[`useCheckout.handleConfirm`](../src/hooks/useCheckout.ts), en este orden:

### 5.1. Registrar la venta
`POST /api/ventas-pos` vía [`postVenta`](../src/api/postVenta.ts). El payload lleva totales,
método de pago, la farmacia de la caja (`pharmacies`) y el arreglo `venta` con cada línea.
Por línea se congelan el costo (`unitCost`), la tasa (`tax`) y el lote elegido
(`lotDocumentId`, `lotNumber`, `expirationDate`). Las relaciones van por **`documentId`**
(regla Strapi v5).

**Si falla, se aborta**: no se descuenta stock ni se imprime ticket, y el cajero ve el error.

### 5.2. Descontar el stock en el servidor
`POST /api/pos-stock/sale { ventaDocumentId }` vía [`posStock.ts`](../src/api/posStock.ts).
El servidor lee las líneas y la farmacia **de la venta guardada** (no confía en el cliente) y,
en una transacción:

1. Por producto: `stock de la farmacia −= Σ cantidades` y el total baja lo mismo. Puede quedar
   **negativo** → aviso `NEGATIVE_STOCK`.
2. Por línea con lote: resta de ese lote; lo que no alcance lo toma de los otros lotes
   vendibles de esa farmacia por caducidad (FEFO). Lo que tampoco alcance se vende **sin lote**
   → aviso `LOTS_INSUFFICIENT`. Un lote nunca queda negativo; al llegar a 0 pasa a `agotado`.
3. Venta sin farmacia (ventas viejas): descuenta de la bodega → aviso `NO_PHARMACY`.

Responde los **niveles** resultantes (stock, total y lotes) y los avisos.

Si la llamada falla (red, servidor caído), la venta ya quedó registrada: el movimiento va a la
**cola de pendientes** ([pending-stock.ts](../src/lib/pending-stock.ts), `localStorage`
`pos_pending_stock`) y se reintenta al abrir el POS y tras cada venta. Es seguro porque la
operación tiene llave única (`sale:<ventaDocumentId>`).

### 5.3. Actualizar el estado local
[`handleSaleComplete`](../src/hooks/useMultiCart.ts) aplica los niveles del servidor al
catálogo en memoria ([`applyStockLevels`](../src/lib/stock.ts)). Si el movimiento quedó en la
cola, resta una aproximación local. Luego limpia el carrito.

### 5.4. Imprimir recibo y cerrar
[`printReceipt`](../src/lib/print-receipt.ts) genera el ticket 80mm (con lote y caducidad por
línea), se refresca el efectivo de caja si aplica y se muestra `SaleCompleteDialog`.

---

## 6. Diagrama del flujo

```
Click producto / escaneo
        │
        ▼
  addProductWithLot ──► aviso si no hay stock · elige lote (0 / 1 / selector)
        │
        ▼
  carrito (useMultiCart, sessionStorage) ──► aviso en la línea si excede lote o stock
        │
        ▼
  Cobrar ──► CheckoutDialog ──► handleConfirm
        │
        ├─(1)─► POST /api/ventas-pos            (si falla: se aborta todo)
        │
        ├─(2)─► POST /api/pos-stock/sale        (transacción: farmacia, total y lotes FEFO)
        │          └─ si falla ──► cola pos_pending_stock (reintento idempotente)
        │
        ├─(3)─► handleSaleComplete              (aplica niveles del servidor + limpia carrito)
        │
        └─(4)─► printReceipt + refetchEfectivo + SaleCompleteDialog
```

---

## 7. Otros movimientos de stock

Todos pasan por `/api/pos-stock/*` y quedan en `stock-operation`.

| Movimiento | Dónde | Endpoint | Efecto |
|---|---|---|---|
| **Devolución** | Historial de Ventas → detalle → Devolver ([return-dialog.tsx](../src/components/admin/return-dialog.tsx)) | `/return` | Suma a la farmacia de la caja o, sin caja, a la de la venta; el total sube. **No regresa a lote.** |
| **Compra** | Compras → Nueva compra ([new-purchase-dialog.tsx](../src/components/admin/new-purchase-dialog.tsx)) | `/purchase` | Suma al destino elegido en **"Entra a"** (bodega o farmacia) y crea un lote por renglón con número. Precio e IVA del catálogo siguen por su PUT. |
| **Traspaso** | Traspasos ([transfer-form.tsx](../src/components/admin/transfer-form.tsx)) | `/transfer` | Mueve unidades y lotes entre ubicaciones; el total no cambia. Rechaza si el origen no alcanza. |
| **Cuadrar** | Stock por farmacia ([stock-count-dialog.tsx](../src/components/admin/stock-count-dialog.tsx)) | `/count` | Conteo físico por lote: cada lote queda con lo contado y el stock con la suma. La diferencia va al total. |
| **Corregir** | Stock por farmacia ([stock-adjust-dialog.tsx](../src/components/admin/stock-adjust-dialog.tsx)) | `/adjust` | Merma o faltante. Sin lote: cambia stock y total. Con lote: lote, stock y total juntos. |
| **Merma de lote** | Caducidades ([discard-lotes.ts](../src/lib/discard-lotes.ts)) | `/discard-lot` | El lote pasa a `vencido` con su cantidad en `discardedQuantity`; baja el stock de su ubicación y el total. |

Lecturas: `/levels?pharmacy=<documentId|bodega>` alimenta **Stock por farmacia** (por ubicación
y la vista **Todas las ubicaciones**, que reemplazó a Reconciliación).

Para renovar una farmacia que quedó en negativo: **Traspasar** desde bodega si la mercancía ya
existe (el total no cambia); **Cuadrar** si se contó; **Corregir** solo para pérdidas reales.

**Permisos** (rol Authenticated en Strapi): todas las acciones de *Pos-stock* (incluida
`count`), *Pharmacy-stock → find*, *Stock-transfer → find* e *Inventory-lot → find*. Si falta
uno, el POS muestra qué acción habilitar.

---

## 8. Límites conocidos

1. **Vender sin stock se permite.** Es deliberado (no bloquear la caja). Las unidades vendidas
   sin lote que las cubra hacen que stock y lotes no coincidan: se ve en Stock por farmacia →
   *Descuadres* y se resuelve con **Cuadrar**.
2. **La devolución no regresa a lote.** Sube el stock pero no el lote → también genera
   descuadre en esa ubicación.
3. **El catálogo de la caja es una foto.** Tras sus propias ventas se actualiza con los niveles
   del servidor, pero no ve las ventas de otras cajas hasta recargar. No corrompe el stock (lo
   calcula el servidor); solo el número mostrado puede ir atrasado.
4. **La cola de pendientes es por navegador** (`localStorage`). Si una caja cierra el navegador
   con movimientos pendientes y no vuelve a abrir el POS, no se reintentan desde otra.
5. **Fecha de caducidad en el navegador en UTC.** El POS decide qué lotes están vencidos con
   `todayISO()` (UTC); el servidor usa la hora de México. Después de las 18:00 la caja puede
   ocultar un lote que vence ese día unas horas antes que el servidor.
6. **Editar precio o IVA de un producto** (tabla de productos, compras) sigue usando el PUT
   REST, que **re-publica** el borrador del producto. El stock ya no pasa por ahí.
