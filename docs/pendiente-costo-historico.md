# Resuelto: el costo de una venta se reescribía solo

Estado: **resuelto** el 2026-09-17. Reportado el día anterior por el mostrador, con dos exports
que lo demostraban.

## Qué pasaba

El reporte por producto le preguntaba el costo al **catálogo, al momento de exportar**, y el
catálogo solo guarda un precio por producto: el de la última compra. Así que cualquier compra
nueva —o cualquier edición manual del costo— reescribía el resultado de todas las ventas
pasadas de ese producto. La misma venta de mostrador pasó de `Retorno 10.84` a `−8.00` solo por
cambiar el costo y re-exportar.

Lo mismo pasaba con la tasa de IVA, y **con el mismo disparador**: confirmar una compra
sobrescribe `priceMember` e `impuesto` del producto en un solo `patchProduct`.

## Qué se hizo

La venta ahora **copia el costo y la tasa al cobrar**, en `useCheckout.ts`, junto a los
snapshots de lote que ya existían:

```ts
unitCost: item.product.priceMember ?? null,
tax: itemImpuesto(item),
```

Dos escalares nuevos en el componente repetible de `ventas-pos.venta`: `unitCost` (Decimal) y
`tax` (Text). `tax` guarda el **código** de la tasa (`iva8`, `exento`), no el monto; va como
Text y no enum porque `itemImpuesto` puede devolver `exento`, que un enum de tres valores
rechazaría. `dashboard-csv.ts` los lee y solo cae al catálogo cuando la venta no los trae.

De paso quedó arreglada una pérdida de dato que nadie había notado: la corrección de tasa que
el cajero hace con el chip de IVA **no se guardaba en ningún lado**. Ahora sí.

## Por qué no se guardó el costo en el lote

Era la otra opción y se descartó por **cobertura**, no por esfuerzo:

- `selectedLot` es opcional y muy seguido null. `page.tsx` vende sin lote cuando el producto
  tiene 0 lotes vendibles, y `getSellableLots` excluye los `agotado` y `vencido`.
- La captura de lotes es manual y va muy atrás: 1 812 productos, y existe
  `/admin/reconciliacion` cuyo único propósito es medir cuánto falta.
- Un arreglo que dependa del lote habría dejado sin costo a un porcentaje alto y no medido de
  ventas, **incluidas las futuras**.

La cadena `lote → compra → costoUnitario` que ya existía tampoco servía: el componente `items`
de la compra no guarda el documentId del lote que generó, solo `numeroLote` como texto, y nada
impide repetirlo en dos renglones con costos distintos. El último salto es ambiguo.

## Qué NO arregla

**Congela lo que el catálogo decía ese día, no lo que costó la pieza.** Si hay dos lotes del
mismo producto comprados a precios distintos, los dos renglones guardan el mismo costo. Mata la
deriva, no la mezcla de lotes. Si algún día eso importa, la vía es el costo en el lote, con el
snapshot como respaldo para los productos sin lotear.

**Solo aplica hacia adelante.** Las ventas anteriores no tienen el costo guardado, así que para
ellas el reporte sigue usando el catálogo con la misma imprecisión. El costo de esos días ya se
sobrescribió y no hay de dónde recuperarlo.

**Y un hueco menor:** una venta posterior al cambio cuyo producto no tenía costo capturado ese
día guarda `unitCost: null`, cae al catálogo, y si el producto se compró después muestra el
costo posterior.

## Cómo verificar

```
npm run validar-margen -- ruta/al/ventas-por-producto_....csv
```

El script separa por la columna `Fecha`: lo anterior al corte queda en dos cubos de ruido
conocido ("IVA de línea" y "deriva del catálogo"), y todo lo que no cuadra desde el corte cae
en **"Revisar"**, que es lo único que mueve el exit code. Ese cubo debe quedar en cero; si algo
aparece ahí ya no puede ser deriva, así que es un precio tecleado a mano o una anomalía real.

El experimento decisivo es el de Marco al revés: vender un producto gravado con membresía,
cambiarle el `priceMember` en Strapi, exportar, y confirmar que la fila no se movió.

El script solo audita membresía y Proveedor: en Mostrador no hay un valor esperado contra el
cual comparar, así que ahí la deriva no se detecta automáticamente.

## Limpieza futura

Cuando ya no queden ventas anteriores al 17/9/2026 en los rangos que se consultan, el fallback
al catálogo se puede borrar: `productsById` y `loadingProducts` en `dashboard-view.tsx` dejan
de hacer falta, y con ellos el `useGetProducts` del dashboard.
