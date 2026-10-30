# Rastreo de lotes en el historial de ventas

Guía interna · Punto de Venta Lymbika

Trabajo del **30-oct-2026** para poder rastrear qué lote se vendió en cada venta, y en qué
ventas salió un lote. Detalle del descuento de stock en [flujo-venta.md](flujo-venta.md) §5.2.

---

## 1. De dónde se partió

La venta ya congelaba por línea el lote que **eligió el cajero** (`lotDocumentId`,
`lotNumber`, `expirationDate`) y el ticket en vivo lo imprimía. Pero:

| Problema | Qué pasaba |
|---|---|
| El historial no mostraba el lote | El detalle de la venta solo tenía Producto, Cant, P.U. y Total. |
| La reimpresión salía sin lote | `handleReprint` no pasaba el lote aunque la venta lo tuviera. |
| Solo se buscaba por folio | No había forma de encontrar las ventas de un producto o de un lote. |
| **El lote guardado podía no ser el real** | Si el lote elegido no alcanzaba, el servidor completaba con otros lotes por caducidad (FEFO) o vendía sin lote. La venta decía "5 del lote A" aunque hubieran salido 2 de A y 3 de B. El reparto real solo quedaba en la bitácora `stock-operation`, que nadie consultaba. |

---

## 2. El plan (5 pasos)

| # | Paso | Estado |
|---|---|---|
| 1 | Mostrar el lote en el detalle de la venta y en la reimpresión | **Hecho** (commit `e4d115a`) |
| 2 | Buscar en el historial por producto o número de lote, y columna Folio | **Hecho** (commit `e4d115a`) |
| 3 | Guardar en la venta los lotes que de verdad salieron (`dispensedLots`) | **Hecho y probado en dev-local**, falta subir |
| 4 | Vista "Ventas de este lote" (trazabilidad inversa, para retiros de lote) | Pendiente |
| 5 | Que la devolución regrese al lote original | Pendiente, opcional |

---

## 3. Pasos 1 y 2 — historial (solo POS)

**Detalle de la venta** ([sale-detail-dialog.tsx](../src/components/admin/sale-detail-dialog.tsx)):
debajo de cada producto, una línea gris con el lote y la caducidad. Los servicios no
muestran nada.

**Reimpresión:** manda el lote (y desde el paso 3, el reparto real), así que sale igual que
el ticket original.

**Buscador** ([sales-table.tsx](../src/components/admin/sales-table.tsx)), placeholder
"Folio, producto o lote":

| Tecleas | Busca en |
|---|---|
| `paracetamol` | Nombre del producto (sin mayúsculas ni acentos) |
| `ABC123` | Número de lote (el elegido y los reales) |
| `123` (solo dígitos) | Folio **y** lote: hay lotes puramente numéricos |
| `#123` | Solo folio |

- Al buscar por producto o lote aparece la columna **Coincide** con el renglón y el lote que
  casó (`Paracetamol · Lote ABC123 · ×2`).
- El texto de cada venta se normaliza **una vez** al cargar (`lineIndex`), no por tecla, igual
  que el catálogo del POS ([optimizacion-catalogo.md](optimizacion-catalogo.md)).
- Sin resultados, el mensaje sugiere la pestaña **Todo** (el período por defecto es Hoy).
- La tabla abre con la columna **Folio** (`#00123`).

---

## 4. Paso 3 — `dispensedLots`

### Qué se guarda

Campo JSON nuevo en el componente de línea de venta `venta-item` (backend):

```json
"dispensedLots": [
  { "lotDocumentId": "fc63…", "lotNumber": "L122027",    "expirationDate": "2027-12-31", "quantity": 1 },
  { "lotDocumentId": "yay3…", "lotNumber": "61840412FQ", "expirationDate": "2027-12-31", "quantity": 1 },
  { "lotDocumentId": null,    "lotNumber": null,         "expirationDate": null,         "quantity": 1 }
]
```

- `lotDocumentId: null` = unidades vendidas **sin lote** que las cubra (producto sin lotes, o
  lotes insuficientes).
- `dispensedLots: null` = **no se sabe**: ventas anteriores al 30-oct-2026, servicios, o venta
  con el descuento todavía en la cola de pendientes (se llena cuando el reintento lo aplica).
- `lotNumber` de la línea **sigue siendo el lote elegido**. Los dos datos conviven: uno es lo
  que pidió el cajero, el otro lo que salió.

### Backend ([stock-core.ts](../../Lymbika-Backend/src/api/pos-stock/services/stock-core.ts) → `sale()`)

1. Mientras descuenta, anota por **posición de línea** las porciones que devuelve `consume()`
   más lo que no alcanzó.
2. Lo devuelve en la respuesta como `result.dispensed` (arreglo por posición, `null` en
   servicios), para que el ticket en vivo imprima los lotes reales.
3. **Después** de confirmar la transacción, `writeDispensed()` lo escribe en las líneas de la
   venta.

Decisiones:

| Decisión | Por qué |
|---|---|
| Escribir **fuera** de la transacción, en `try/catch` | Rastrear nunca debe poder tumbar un cobro. Si falla, el stock ya quedó descontado; la venta solo se queda sin reparto (aviso `DISPENSED_NOT_SAVED`, log `warn`) y la bitácora conserva los movimientos. Dentro de la transacción, un error habría revertido el descuento y dejado la venta reintentándose en la cola. |
| Escribir en **las dos versiones** de la venta | `venta-pos` tiene `draftAndPublish: true`: borrador y publicada tienen cada una su copia del componente. |
| Empatar por posición **y** confirmar producto y cantidad | Si una versión no coincide, se lanza error (cae al `catch`) en vez de escribir el reparto en la línea equivocada. |
| Un reintento (`duplicate`) no reescribe | El reparto ya se guardó la primera vez; el duplicado no recalcula nada. |
| Campo JSON y no componente/relación | Una línea puede salir de N lotes; el JSON es la foto inmutable de ese momento, igual que los demás snapshots de la línea. |

### POS

| Archivo | Qué hace |
|---|---|
| [types/venta.ts](../src/types/venta.ts) | `DispensedLot` y `VentaItemType.dispensedLots` |
| [lib/venta-lotes.ts](../src/lib/venta-lotes.ts) | `lineLots(item)` → `{ lots, exact }`: el reparto real si existe, si no el lote elegido con `exact: false`. `lotPortionLabel`, `fmtCaducidad`. **Usar siempre `lineLots`**, no leer `dispensedLots` directo. |
| [api/posStock.ts](../src/api/posStock.ts) | `saleDispensed(op)`: lee `result.dispensed` con validación (el runner es genérico y tipa `result` como `unknown`; sin `as any`). |
| [hooks/useCheckout.ts](../src/hooks/useCheckout.ts) | El ticket en vivo recibe `lots` por línea. Si el descuento quedó en la cola, imprime el lote elegido como antes. |
| [lib/print-receipt.ts](../src/lib/print-receipt.ts) | `ReceiptItem.lots`: un renglón por lote, con `×n` solo si la línea salió de más de uno. Una línea toda sin lote no imprime nada (como antes). |
| [sale-detail-dialog.tsx](../src/components/admin/sale-detail-dialog.tsx) | Un renglón por lote. Sin reparto: `Lote X (elegido al cobrar)` o `Sin lote registrado`. |
| [sales-table.tsx](../src/components/admin/sales-table.tsx) | La búsqueda incluye lotes reales y elegido; **Coincide** muestra solo la porción del lote buscado. |

---

## 5. Cómo se probó (30-oct-2026)

Contra la BD **dev-local** de Neon (`ep-twilight-…`; se verificó el host antes de correr), sin
navegador ni HTTP: un script que carga Strapi sin el admin (`compileStrapi` +
`createStrapi().load()`) y llama a `strapi.service('api::pos-stock.stock-core').sale()`, la
misma función que usa el endpoint. Cargar Strapi sincronizó el esquema y creó la columna en
dev-local.

Venta de prueba **#2373** (`y0wvphb3zfil0tx3xb7mzo6y`), producto "Labello glowy lips berry"
en Farmacia Lymbika, con dos lotes de 1 pieza cada uno:

| Línea | Pedido | `dispensedLots` resultante |
|---|---|---|
| 0 · Consulta (servicio) | — | `null` ✓ |
| 1 · Labello ×2, eligiendo `L122027` (tenía 1) | 2 del mismo lote | 1 de `L122027` + 1 de `61840412FQ` ✓ |
| 2 · Labello ×1, sin lote elegido | lotes ya agotados | `Sin lote ×1` ✓ (aviso `LOTS_INSUFFICIENT`) |

Además:
- `result.dispensed` trajo el mismo reparto.
- Borrador **y** publicada quedaron con el reparto; la lectura con el `populate` de `getVentas`
  lo trae.
- Reintentar la misma venta → `duplicate: true`, sin error y sin descontar de nuevo.
- Las funciones del POS (`lineLots`, `lotPortionLabel`, `buildReceiptHtml`) se corrieron con
  esos datos con `npx tsx`: detalle y ticket muestran un renglón por lote.

**No se probó:** el recorrido completo en el navegador (cobrar en la caja → historial →
buscar) y la ruta de error `DISPENSED_NOT_SAVED`.

**Efecto en dev-local:** la venta #2373 quedó **cancelada** pero su descuento se aplicó (los dos
lotes de Labello agotados, la farmacia en −1). Para limpiar: Neon → `dev-local` → "Reset from
parent".

---

## 6. Puesta en marcha

- [ ] Commit y push del **backend** primero. Render, al arrancar, agrega la columna.
      Si `npm run develop` regenera `types/generated`, incluirlo en el commit.
- [ ] Después commit y push del **POS**. Si el POS sube antes no se rompe nada: ve `null` y
      cae al lote elegido.
- [ ] Probar en producción con una venta real de un producto loteado: el ticket y el detalle
      deben mostrar el lote.

---

## 7. Límites y pendientes

1. **Ventas anteriores al 30-oct-2026 no tienen reparto.** Se podrían rellenar con un script
   que lea `stock-operation` (`opKey = sale:<ventaDocumentId>`): sus `movements` traen
   `lotDocumentId`, `lotNumber` y `delta` por lote. Daría historia completa desde el
   28-sep-2026 (stock por farmacia). Ojo: la bitácora agrupa por **producto**, no por línea;
   si una venta tiene dos líneas del mismo producto, el reparto entre ellas hay que
   reconstruirlo con la misma regla de `consume()` (preferido primero, luego FEFO).
2. **Paso 4 pendiente: "Ventas de este lote".** Desde Caducidades o Stock por farmacia: en qué
   folios, fechas y farmacia salió un lote, y cuántas piezas. Es lo que se necesita ante un
   retiro de lote. Depende de `dispensedLots` para ser exacta.
3. **El historial carga como máximo 5000 ventas** (`getVentas`, filtrado en cliente). Para
   retiros que vayan más atrás, la búsqueda por lote tendría que ir al backend.
4. **Los CSV de ventas no tienen columnas de lote.** Agregarlas al archivo por producto sería
   natural: una fila por porción de lote.
5. **La devolución no regresa al lote** (paso 5): el rastro se corta ahí y deja descuadre
   entre stock y lotes.
6. **El ticket en vivo** solo trae reparto si el descuento se aplicó en el momento; si quedó en
   la cola, imprime el lote elegido (el historial sí se corrige cuando el reintento pasa).
