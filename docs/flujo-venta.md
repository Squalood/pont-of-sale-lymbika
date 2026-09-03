# Flujo de venta de un producto y descuento de stock

Documento del flujo **actual** (no propuesto) de cómo se vende un producto en el POS y
cómo se descuenta del stock general (`stock_central`).

---

## 1. Resumen en una línea

El stock vive en el campo `stock_central` de cada producto en Strapi. Al cobrar, el
frontend calcula el nuevo valor (`stock actual − cantidad`) y lo **sobrescribe** con un
`PUT` por producto. El estado local se actualiza en paralelo para reflejar el cambio sin
recargar. **La venta NO descuenta lotes** (`lote`); los lotes solo se afectan en compras.

---

## 2. Carga inicial de productos

- Hook: [`useGetProducts`](../src/api/getProducts.ts) — hace `GET /api/products` con
  `fields` y `populate` explícitos (hasta 5000 items) y devuelve `result: ProductType[]`.
  Pedía `populate=*` hasta el 3-sep-2026; ver [optimización del catálogo](optimizacion-catalogo.md).
  Los `inventory_lots` se piden explícitos, así que siguen llegando.
- Cada producto trae su stock en `stock_central` ([product.ts:53](../src/types/product.ts#L53)).
- En [`page.tsx`](../src/app/page.tsx#L28-L30) los productos se copian a un **state local**
  `products`, que es la fuente de verdad de stock durante la sesión de caja:

  ```ts
  const { result: fetchedProducts } = useGetProducts();
  const [products, setProducts] = useState<ProductType[]>([]);
  useEffect(() => { setProducts(fetchedProducts); }, [fetchedProducts]);
  ```

Ese `setProducts` se pasa a [`useMultiCart`](../src/hooks/useMultiCart.ts) para poder
mutar el stock localmente al vender.

---

## 3. Armado del carrito

- El POS soporta **hasta 4 carritos simultáneos** (`MAX_CARTS`) vía
  [`useMultiCart`](../src/hooks/useMultiCart.ts).
- Un `CartItem` puede ser `product` o `service` ([product.ts:13-15](../src/types/product.ts#L13-L15)).
  Solo los de tipo `product` descuentan stock.
- Se agrega al carrito haciendo click en la grilla ([page.tsx:81-87](../src/app/page.tsx#L81-L87))
  o escaneando código de barras ([cart-panel.tsx:80-87](../src/components/cart-panel.tsx#L80-L87)).
- Cada carrito tiene una **tarifa** (`priceMode`): `regular`, `member` (Health Pass) o
  `proveedor` ([pricing.ts](../src/lib/pricing.ts)). Es un solo valor, así que los dos
  switches del panel no pueden quedar encendidos a la vez.
- El precio de lista de la línea sale de esta prelación:
  1. `overridePrice` si el cajero editó el precio manualmente, si no
  2. `priceMember` si la tarifa es `member` o `proveedor`, si no
  3. `price` regular.

  Sobre ese precio de lista actúa después el impuesto de la línea (ver 3.1).
- La tarifa `proveedor` agrega automáticamente un **management fee del 10%** sobre la
  mercancía ([useCartTotals.ts](../src/hooks/useCartTotals.ts)). No hay switch aparte para
  el fee: es consecuencia de la tarifa. Se cobra sin IVA trasladado (entra al desglose a
  tasa 0), que es decisión contable a revisar si algún día la factura se siembra desde el
  impuesto de línea.

> Nota: en este punto **no** se valida que haya stock suficiente. Se puede agregar más
> cantidad de la que existe en `stock_central`.

---

## 3.1. IVA por línea

El precio de lista trae su impuesto dentro. **La base sin impuesto es el invariante**: se
despeja una vez con el impuesto que el producto tiene marcado, y la tasa efectiva decide
qué se cobra encima de esa base.

```
base  = precioLista / (1 + tasa(product.impuesto))
cobra = base × (1 + tasa(tasa efectiva de la línea))
```

Un producto de $100 marcado `iva8` tiene base 92.59, así que:

| Corregido a | Cobra |
|---|---|
| `iva0` | 92.59 |
| `iva8` (sin tocar) | 100.00 |
| `iva16` | 107.41 |

Sin correcciones el cobro es **el precio de lista tal cual** — [`itemUnitPrice`](../src/lib/pricing.ts)
corta el cálculo en ese caso para que sea bit-exacto y no aparezca deriva de
`precio / 1.08 × 1.08`.

- La tasa efectiva sale de [`itemImpuesto`](../src/lib/pricing.ts): corrección del cajero,
  si no la del producto ([`productImpuesto`](../src/lib/pricing.ts)).
- `productImpuesto` es el divisor con el que se despeja la base, así que **nunca** mira la
  corrección. Lee `product.impuesto` y nada más: **el backend es la única autoridad**, no
  hay inferencia por categoría. Un producto sin el campo capturado se cobra sin IVA; se
  corrige en Strapi, o con el chip si es solo para esa venta.
- Un precio editado a mano gana sobre todo: es lo que paga el cliente, y de ahí se extrae
  la base con la tasa efectiva.
- Los **servicios médicos** son siempre **8%**, fijo y no editable
  ([`SERVICE_IMPUESTO`](../src/lib/pricing.ts)). El backend no manda impuesto para las
  tarifas y su precio ya lo trae dentro, así que el 8% solo se desglosa para mostrarlo: el
  total no se mueve, únicamente aparece la base y el importe del impuesto.
- El cajero corrige la tasa desde el chip de cada línea
  ([tax-chip.tsx](../src/components/cart/tax-chip.tsx)). El override vive **solo durante
  la venta**: no se persiste por línea, solo el agregado `venta.iva`. Por eso el ticket
  de la venta viva imprime una fila por tasa, y una reimpresión desde el admin imprime
  una sola fila `IVA incluido` con el agregado.

### Regla de redondeo

[`computeIvaBreakdown`](../src/lib/tax.ts) devuelve los importes **cerrados en centavos**:
`subtotal + Σ filas de IVA + fee === total`, exacto. Es necesario porque con dos tasas en
el mismo carrito, redondear cada fila por separado descuadra el ticket — con 149.00 al 8%
y 99.00 al 16% las filas independientes suman 248.01 contra un total de 248.00. El residuo
se absorbe en la fila de impuesto más grande. Carrito, ticket y detalle de venta renderizan
del mismo conjunto cerrado, así no pueden contradecirse entre sí.

> El selector general de IVA 0/8/16 del carrito **se eliminó**. El impuesto es por
> artículo, no por carrito. Además calculaba `manualIva` sobre una base que ya incluía
> IVA, así que un suplemento en un carrito con el selector en 16% pagaba IVA dos veces.

---

## 4. Checkout / confirmación de pago

El botón de cobrar abre `CheckoutDialog`. Al confirmar se ejecuta
[`useCheckout.handleConfirm`](../src/hooks/useCheckout.ts#L40-L141), que hace **cuatro
cosas en orden**:

### 4.1. Registrar la venta en el backend
`POST /api/ventas-pos` vía [`postVenta`](../src/api/postVenta.ts). El payload incluye
totales, método de pago, farmacia y el arreglo `venta` (componente repetible) con cada
línea. Las relaciones se envían con **`documentId`** (regla Strapi v5):

```ts
product: item.product.documentId,      // producto
service_rate: item.serviceRate.documentId,  // o servicio
```

Devuelve el `id` de la venta (usado como folio en el recibo). Si falla, se captura el
error y **el flujo continúa igual** ([useCheckout.ts:100-102](../src/hooks/useCheckout.ts#L100-L102)).

### 4.2. Descontar el stock (el punto clave)
Solo para ítems de tipo `product`, en paralelo con `Promise.allSettled`:

```ts
await Promise.allSettled(
  items
    .filter((i) => i.type === "product")
    .map((i) => patchProductStock(i.product.documentId, i.product.stock_central - i.quantity))
);
```
([useCheckout.ts:104-108](../src/hooks/useCheckout.ts#L104-L108))

[`patchProductStock`](../src/api/patchProductStock.ts) hace un
`PUT /api/products/{documentId}` con **el valor absoluto ya calculado**:

```ts
body: { data: { stock_central: newStock } }   // no es un decremento atómico
```

### 4.3. Actualizar el estado local
[`handleSaleComplete`](../src/hooks/useMultiCart.ts#L95-L109) resta la cantidad al
`stock_central` del producto en el array `products` en memoria, limpia el carrito y
muestra el toast. Así la UI refleja el nuevo stock sin volver a llamar a la API.

### 4.4. Imprimir recibo y cerrar
[`printReceipt`](../src/lib/print-receipt.ts) genera el ticket 80mm, se refresca el
efectivo de caja (si aplica) y se muestra `SaleCompleteDialog`.

---

## 5. Diagrama del flujo

```
Click producto / escaneo
        │
        ▼
  addToCartOf ──► carrito en memoria (useMultiCart)
        │
        ▼
  Botón cobrar ──► CheckoutDialog ──► handleConfirm
        │
        ├─(1)─► POST /api/ventas-pos           (registra venta; error = solo log)
        │
        ├─(2)─► PUT  /api/products/{documentId} × N   (stock_central = actual − cantidad)
        │
        ├─(3)─► handleSaleComplete             (resta stock en state local + limpia carrito)
        │
        └─(4)─► printReceipt + refetchEfectivo + SaleCompleteDialog
```

---

## 6. Observaciones y riesgos del flujo actual

1. **Escritura absoluta, no atómica.** `patchProductStock` envía
   `stock_central = actual − cantidad` calculado en el cliente. Si dos ventas del mismo
   producto ocurren en paralelo (dos cajas/pestañas), la segunda puede pisar a la primera
   y "perder" un descuento (condición de carrera). Un decremento del lado del servidor
   sería más seguro.

2. **La venta no toca lotes.** Existe `LoteType` ([lote.ts](../src/types/lote.ts)) con
   `currentAmount` y control de caducidad, pero solo se llena en **compras**
   ([postLote](../src/api/postLote.ts)). Al vender, `stock_central` y los lotes se
   desincronizan: la suma de `currentAmount` de los lotes deja de coincidir con
   `stock_central`. No hay lógica FEFO (primero en caducar, primero en salir) en la venta.

3. **Fallo silencioso al registrar la venta.** Si `postVenta` falla, se hace `console.error`
   y **igual se descuenta el stock e imprime el recibo** con `receiptId = 0`. Resultado:
   stock descontado sin venta registrada.

4. **`Promise.allSettled` ignora fallos de stock.** Si un `PUT` de stock falla, no se
   reintenta ni se avisa; la venta se da por completada. El state local sí se resta
   (via `handleSaleComplete`), quedando desalineado con el backend.

5. **Sin validación de stock disponible.** No se impide vender más unidades de las que hay
   en `stock_central` (puede quedar negativo).
```

