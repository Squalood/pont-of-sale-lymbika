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

- Hook: [`useGetProducts`](../src/api/getProducts.ts) — hace `GET /api/products?populate=*`
  (hasta 5000 items) y devuelve `result: ProductType[]`.
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
- El precio por línea sale de [`useCartTotals.getPrice`](../src/hooks/useCartTotals.ts#L7-L11):
  1. `overridePrice` si el cajero editó el precio manualmente, si no
  2. `priceMember` si el carrito es Health Pass (`isMember`), si no
  3. `price` regular.

> Nota: en este punto **no** se valida que haya stock suficiente. Se puede agregar más
> cantidad de la que existe en `stock_central`.

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

