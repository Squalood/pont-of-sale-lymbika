# Pendiente: la base fiscal del precio de proveedor

Estado: **abierto**, bloqueado por una verificación contra facturas de compra.
Abierto el 2026-09-16 por un reporte de márgenes negativos en Health Pass.
Última revisión: 2026-09-16, después de corregir el reporte y el default de IVA en compras.

Para quien retome esto. La guía que leen los colaboradores es
[reportes-csv.md](reportes-csv.md); este documento es el expediente del defecto.

## Qué sigue abierto

Una sola pregunta, y no se puede contestar desde el sistema:

> **¿El precio de proveedor capturado en una compra es el neto del proveedor, o el total
> facturado con IVA?**

Los dos lados del sistema se contradicen sobre el mismo campo, `priceMember`:

| Camino | Qué asume | |
|---|---|---|
| Compra — `new-purchase-dialog` + `purchase/helpers` | **Neto** (la línea es `costo × (1 + IVA)`) | escribe |
| Venta — `pricing.ts` → `itemNetPrice` | **Bruto** (divide entre `1 + IVA`) | lee |
| Reporte — `dashboard-csv.ts` | **Neto** (`priceMember` crudo) | lee |

Compra y reporte concuerdan. El que discrepa es `pricing.ts`, que es el que le cobra al
cliente. Según la respuesta se mueve **un solo lado**, y las consecuencias son muy distintas:

- **Es neto** → se corrige **solo `pricing.ts`**: debe sumar el IVA encima en vez de
  extraerlo. Y es la rama grave: el punto de venta viene **cobrando de menos** al socio
  Health Pass en todo producto gravado. Es un problema de cobro, no de reporte.
- **Es bruto** → se corrigen **compra y reporte**: el total de la compra viene inflado por el
  IVA y la columna de costo está mal etiquetada. `pricing.ts` ya está bien.

### Cómo resolverla

La app calcula el total de cada línea de compra como `lo tecleado × (1 + IVA)`, así que el
Total que mostró al registrarla delata qué se capturó. Se compara contra el total de la
factura del proveedor:

```
coinciden                  → se tecleó el NETO
app sale 8-16 % más alto   → se tecleó el BRUTO
```

En **varias** compras, no una: lo que se mide es un hábito de captura de personas y puede no
ser uniforme. Conviene cubrir **distintos proveedores y distintos operadores**. Si aparecen
los dos comportamientos, el campo no tiene una sola base y normalizar tendrá que decidirse
producto por producto en lugar de con una migración global.

Solo sirven las compras con **factura adjunta**, **tasa de IVA capturada** y **costos
registrados**. Para sacar la lista ya repartida entre proveedores y operadores:

```
npm run candidatas-factura -- ruta/al/compras_....csv
```

Vale la pena incluir la compra que dejó `priceMember = 7.82` en "Agua Ciel Purificada 1 L":
es el único caso de producción del camino de fee-dentro-del-precio (ver abajo).

## Orden de trabajo

Ordenados por dependencia, no por esfuerzo. Adelantar cualquiera vuelve permanente un dato
que todavía es ambiguo.

**1. Verificar la base fiscal** contra facturas. Bloquea todo lo demás.

**2. Normalizar `priceMember`** a una sola base, y alinear compra y venta para que no vuelvan
a divergir.

**3. Completar el `impuesto` del catálogo.** ⚠️ **Decisión de negocio, con revisión contable
— no es tarea técnica.** Qué tasa le corresponde a cada producto la determina su
clasificación fiscal, no un criterio de programación; lo que se capture aquí es lo que se le
cobra y se le declara al cliente en toda venta futura. El sistema solo provee el campo y la
marca ámbar de "Sin capturar" en `/admin/productos`.

> **Por qué va después de normalizar.** Los renglones que hoy cumplen el invariante lo
> cumplen **solo porque su producto tiene la tasa en cero** — con tasa 0 las dos
> interpretaciones del campo coinciden y el defecto se vuelve invisible. Al completar el
> campo esos renglones pasan a fallar. Completar el IVA es mejora fiscal pura, pero
> **multiplica el defecto del costo** si la base no se normalizó antes.

**4. Congelar el costo en el lote** al momento de la venta, para matar la deriva del catálogo
(defecto 2). Va después de 2 por la misma razón: congelar antes de normalizar vuelve
permanente el dato ambiguo.

## Los dos defectos

**1. Base fiscal del costo.** `Subtotal` es neto y `Costo total` es crudo, así que al
restarlos el resultado sale corrido exactamente **el IVA de la línea** en todo producto
gravado. Es el defecto que sigue abierto y el que el paso 2 resuelve.

**2. Deriva del catálogo.** El costo se toma del catálogo al momento de exportar, no del
momento de la venta. Lo resuelve el paso 4. Documentado como limitación conocida en la guía.

### La causa raíz del defecto 1

**La base fiscal de `priceMember` no es fija: la decide el campo `impuesto` del producto.**
Con `impuesto = iva0` el divisor vale 1 y el campo se comporta como **neto**; con `iva8` o
`iva16` se comporta como **bruto**.

La ruta que lo produce está en la rama larga de `itemUnitPrice` (`src/lib/pricing.ts`), la
que se toma cuando la tasa efectiva difiere de la del producto —
`(cobrado / (1 + tasa dentro)) * (1 + tasa efectiva)` — y **corre al cobrar, no al
capturar**: decide el precio que paga el cliente y que queda persistido. La captura de
compras no la usa; tiene su propio `ivaMultiplier` en `purchase/helpers.ts`.

Es comportamiento **deliberado y documentado** (ver el commit del IVA por artículo), no un
defecto en sí: es el mecanismo que explica por qué la base del campo no es estable.

### El único caso de producción del camino nuevo

Folio `01753` (7/9/2026, "Agua Ciel Purificada 1 L", tarifa Proveedor) fue **el único renglón
con `Fee en el precio = Sí`** en el export de 153 renglones, y **cumplía** el invariante
mientras los demás gravados fallaban:

```
Costo unitario 7.82 · Subtotal 8.60 · Impuestos 0.69 · Total 9.29
8.60 = 7.82 × 1.10   →  el IVA quedó ENCIMA del precio con fee
```

Se descarta que fuera un precio tecleado a mano: el ticket es de una sola línea, así que el
fee del ticket (0.84) es el persistido, e `itemFeeAmount` devuelve 0 en líneas manuales.

Quedan dos mecanismos que producen ese 9.29 y **no se separan desde los exports**, porque los
dos exigen un factor de exactamente 1.08:

- el producto estaba en `iva0` el 7/9 y el cajero corrigió la tasa con el chip, o
- `priceMember` era 8.4455 el 7/9 y bajó a 7.82 después.

Separarlos requiere el registro del producto en Strapi: su historial de `impuesto` y la
compra que dejó `priceMember = 7.82`.

## Ya resuelto

Lo que se cerró el 2026-09-16, para no volver a abrirlo:

- **El reporte ya no muestra márgenes engañosos.** La columna `Margen` se reemplazó por
  `Retorno`, que contesta según la tarifa: en Mostrador el margen de mercancía, en Proveedor
  el management fee, en Health Pass cero por diseño. Los negativos de Health Pass —el
  síntoma que originó el reporte— desaparecieron. Solo el Retorno de **Mostrador** sigue
  arrastrando el defecto 1.
- **La compra ya no borra la tasa del producto.** El renglón arrancaba en `iva: "exento"`
  fijo y al confirmar sobrescribía el `impuesto` del producto poniéndolo en `iva0`: 113 de
  135 compras habían apagado la tasa de los productos que tocaban. Ahora arranca con la tasa
  que el producto ya tiene (`ivaDesdeProducto`). Sin esto, el paso 3 era trabajo que la
  siguiente compra deshacía.
- **El export de compras dice si hay tasa capturada** (columna `IVA registrado`), que es lo
  que permite filtrar las compras que sirven para la prueba.

## Herramientas

```
npm run validar-margen     -- ruta/al/ventas-por-producto_....csv
npm run candidatas-factura -- ruta/al/compras_....csv
```

[validar-margen](../scripts/validar-margen.mjs) audita un export contra el invariante del
costo (calcula `Subtotal − Costo total` y lo contrasta con lo que la tarifa obliga), y separa
las violaciones por defecto: base fiscal vs deriva del catálogo. Sale con código 1 si hay
violaciones, así que sirve para confirmar que el paso 2 las llevó a cero sin revisar los
renglones a mano.

Línea base sobre el export del 2026-09-01 al 2026-09-16 (153 renglones), **antes** de
cualquier corrección de la base:

```
  Con invariante verificable      67
  ✓ Cumplen                       41     (todos de productos con IVA 0)
  ✗ Desviación = IVA de línea     20     defecto 1
  ✗ Desviación arbitraria          6     defecto 2
```

Es contra lo que hay que comparar después del paso 2. Si la normalización es correcta, los 20
del defecto 1 deben irse a cero.
