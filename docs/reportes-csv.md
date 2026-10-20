# Reportes del dashboard en CSV

Guía interna · Punto de Venta Lymbika

El dashboard exporta **cuatro archivos**: dos de ventas y dos de compras. En cada par no hay
uno resumido y otro detallado — son la misma información vista a dos alturas: **una fila por
documento**, o **una fila por mercancía**. Esta guía explica cuál bajar, qué significa cada
columna y qué cifras se pueden auditar al centavo.

---

## Dónde están y qué alcance tienen

Entra al **Panel de administración → Dashboard**. Cada sección tiene su par de botones en el
encabezado:

| Sección | Botones |
|---|---|
| **Ventas** | `CSV por venta` · `CSV por producto vendido` |
| **Compras** | `CSV por compra` · `CSV por producto comprado` |

La página `/admin/compras` no exporta nada: todo sale del Dashboard.

Los cuatro archivos respetan **los filtros que tengas activos** en ese momento: el período
(Hoy, Semana, Mes, Todo o un rango del calendario), la sucursal y el operador. Lo que ves en
pantalla es exactamente lo que se descarga — con una excepción, la sucursal en compras, que
se explica en su sección.

El nombre del archivo deja constancia de esos filtros, para que no se confundan dos descargas
distintas:

```
ventas_2026-08-11_2026-08-18_centro_ana.csv
```

- Las ventas **canceladas nunca aparecen** en ningún reporte.
- Si el período es muy largo, el dashboard avisa en pantalla que solo cargó las 5 000 ventas
  más recientes. Si ves ese aviso, parte el rango en tramos más cortos.

---

## Ventas: cuál de los dos bajar

La diferencia está en qué representa una fila.

| Comparación | **Por venta** | **Por producto vendido** |
|---|---|---|
| **Archivo** | `ventas_….csv` | `ventas-por-producto_….csv` |
| **Una fila es** | un ticket | un producto dentro de un ticket |
| **Qué detalla** | cómo se cobró la venta | qué mercancía se vendió |
| **Úsalo para** | cuadrar caja y contabilidad | márgenes y decidir qué conviene vender |
| **Columnas** | 19 | 14 |

La columna **Folio** es la que los une. Un folio aparece **una sola vez** en el archivo por
venta, y **tantas veces como productos tenga** en el archivo por producto.

> **Por qué el nombre puede engañar**
>
> El archivo por venta tiene *más* columnas que el archivo por producto. Tener más columnas
> no lo hace "el detallado": cada uno detalla una cosa distinta. El de venta detalla *el
> cobro*; el de producto detalla *la mercancía*.

---

## Archivo por venta

Una fila por ticket. Es el archivo de caja y contabilidad. **Todas sus columnas son exactas**:
son los importes que quedaron grabados en el momento del cobro y no se recalculan nunca.

| Columna | Qué contiene |
|---|---|
| Fecha | Fecha y hora del cobro. |
| Folio | Número del ticket, a cinco dígitos. Liga con el otro archivo. |
| Farmacia | Sucursal donde se hizo la venta. |
| Operador | Usuario que cobró. |
| Tarifa | Mostrador, Lymbika+ o Proveedor. Ver la sección de tarifas. |
| Método de pago | Efectivo, tarjeta, transferencia o mixto. |
| Subtotal | Mercancía sin impuesto. |
| IVA | Impuesto de todo el ticket. |
| Management fee | El 10 % de la tarifa Proveedor. Ver la columna siguiente antes de sumarlo. |
| Fee en el precio | **Sí**: el fee ya está dentro de Subtotal + IVA. **No**: se cobró aparte y sí se suma. Vacío si el ticket no lleva fee. |
| Recargo tarjeta | 3 % que paga un cliente Lymbika+ al pagar con tarjeta. |
| Total | Lo que realmente pagó el cliente. |
| Efectivo MXN | Pesos recibidos menos el cambio entregado. |
| Efectivo USD | Dólares recibidos, **sin convertir**. |
| Tipo de cambio | Tipo de cambio con el que se recibieron esos dólares. |
| Tarjeta cobrada | Lo que se pasó en la terminal, recargo incluido. Es lo que reporta el banco. |
| Transferencia | Monto recibido por transferencia. |
| Artículos | Piezas totales del ticket. |
| Nota | Comentario que el cajero escribió en la venta. |

### La suma que siempre debe cerrar

Depende de lo que diga **Fee en el precio** en esa misma fila:

```
Fee en el precio = Sí  →  Subtotal + IVA + Recargo tarjeta = Total
Fee en el precio = No  →  Subtotal + IVA + Management fee + Recargo tarjeta = Total
```

**Sí** es como se cobra hoy: el 10 % va dentro del precio de cada producto, así que ya está
contado en Subtotal + IVA y el monto de la columna es solo informativo. **No** son los
tickets anteriores al cambio, donde el fee se sumaba al final.

Las columnas están juntas y en ese orden, con la bandera pegada al fee que califica, para
que puedas verificarlo de un vistazo. Si una fila no cierra con su regla, es un error que
hay que reportar.

---

## Archivo por producto vendido

Una fila por producto vendido. Es el archivo de márgenes.

Las 14 columnas van en cinco bloques, y dentro de cada uno el orden sigue la aritmética,
para que las sumas se lean de izquierda a derecha sin saltar columnas.

#### 1. De qué ticket viene

Describen el ticket completo, así que **se repiten en cada renglón del mismo folio**. Todas
son exactas.

| Columna | Qué contiene |
|---|---|
| Fecha | Fecha y hora del ticket. |
| Folio | Ticket al que pertenece el renglón. Liga con el archivo por venta. |
| Método de pago | Efectivo, tarjeta, transferencia o mixto. |
| Tarifa | Mostrador, Lymbika+ o Proveedor. |
| Fee en el precio | Igual que en el archivo por venta. |

#### 2. Qué se vendió

Exactas las dos.

| Columna | Qué contiene |
|---|---|
| Producto | Nombre del producto o del servicio. |
| Cantidad | Piezas vendidas en ese renglón. |

#### 3. Lo que costó

El costo se copia a la venta al cobrar, así que no cambia después. En ventas anteriores al
17/9/2026 se usa el del catálogo — ver *Qué cambió y desde cuándo*.

| Columna | Qué contiene |
|---|---|
| Costo unitario | Lo que nos costó una pieza, sin impuesto. |
| Costo total | Cantidad × costo unitario. |

#### 4. Lo que se cobró

Exactas las cuatro: la tasa de IVA también queda copiada en la venta, incluida la corrección
que el cajero haga con el chip.

| Columna | Qué contiene |
|---|---|
| Precio de venta | Precio unitario **sin impuesto**. |
| Subtotal | Cantidad × precio de venta. Sin impuesto. |
| Impuestos | IVA de ese renglón. |
| Total cobrado | Lo que pagó el cliente por ese renglón. **Ojo: no es `Costo total`.** |

#### 5. La conclusión

| Columna | Qué contiene |
|---|---|
| Retorno | `Subtotal − Costo total`. Qué dejó el renglón — ver la nota de abajo. |

### Las sumas que siempre deben cerrar

```
Precio de venta × Cantidad = Subtotal
Subtotal + Impuestos       = Total cobrado
Cantidad × Costo unitario  = Costo total
Subtotal − Costo total     = Retorno
```

> **No sumes estas columnas**
>
> **Método de pago**, **Tarifa** y **Fee en el precio** describen el ticket, no el renglón,
> así que se repiten en cada producto del mismo folio. Sirven para filtrar o para una tabla
> dinámica, no para totalizar. Para totales por método de pago usa el archivo por venta.
>
> En ventas **mixtas** la columna solo dice *mixto*: no hay forma de saber qué producto se
> pagó con qué. El desglose está en el archivo por venta.

> **Cómo leer la columna Retorno**
>
> Es una sola resta, `Subtotal − Costo total`, igual en las tres tarifas. Los dos vienen sin
> impuesto, así que la resta mide el negocio de verdad.
>
> Cada tarifa cae en un valor esperado **por cómo está armado su precio**, no porque el
> reporte lo imponga:
>
> | Tarifa | Qué deberías ver | Por qué |
> |---|---|---|
> | **Mostrador** | Variable, positivo | Es la única con precio propio de venta. |
> | **Lymbika+** | **0.00** | Se vende al costo de proveedor, sin margen. |
> | **Proveedor** | El **10 %** del costo | Es el management fee, que va dentro del precio. |
>
> Un cero en Lymbika+ **no es una venta a pérdida**: es el precio funcionando como se
> diseñó. Lo que deja el programa (cuota, volumen, recurrencia) no se mide en esta línea.
>
> **Si un renglón se sale de su valor esperado, es una señal real** — un costo mal capturado,
> un precio tecleado a mano, o mercancía que cambió de precio. Vale revisarlo.

### Qué cambió y desde cuándo

Hay dos fechas de corte, y los cambios se notan al comparar reportes de antes y después. Las
ventas viejas se quedan como fueron: **no se recalculan nunca**.

**1. El costo y el IVA ahora quedan congelados en la venta.** Antes el reporte le preguntaba al
catálogo *"¿cuánto cuesta este producto?"* al momento de exportar, y el catálogo solo recuerda
la última compra. Entonces una compra nueva reescribía el costo de todas las ventas pasadas de
ese producto, y una venta que había dejado ganancia podía aparecer como pérdida meses después.

Desde esa fecha, el costo y la tasa se copian a la venta al cobrar y ya nadie los mueve. En
ventas anteriores el reporte sigue usando el costo de hoy, así que **una exportación de ventas
viejas puede dar cifras distintas cada vez que cambian los costos del catálogo**.

**2. Lymbika+ ya cobra el IVA.** En ventas anteriores verás **Retorno negativo en
Lymbika+** sobre productos gravados (no en medicamentos, que son tasa 0). No es un error del
reporte: hasta esa fecha el sistema le cobraba al socio el costo de proveedor **sin sumarle el
impuesto**, así que esas ventas realmente perdieron el IVA.

**3. El precio del catálogo pasó a ser sin IVA** — el **5 de octubre de 2026**. Antes el precio
del producto traía el impuesto dentro y el cobro lo despejaba; desde esa fecha el precio se
captura sin IVA y el punto de venta se lo suma al cobrar.

Para leer el reporte importa esto: en los productos gravados el cliente paga más, así que el
**Retorno de mostrador da un escalón hacia arriba** a partir de ese día. El IVA que antes salía
de adentro del precio ahora se cobra encima. Las columnas significan lo mismo que siempre
—`Subtotal` y `Costo total` siguen sin impuesto— y lo único que cambió es cuánto se cobró. En
los productos a tasa 0, que son la mayor parte del catálogo, no cambia nada.

Si exportas un período que cruza esa fecha, ese escalón es el cambio, no un error.

**Lo que sigue siendo aproximado, incluso en ventas nuevas.** El costo que se congela es el que
el catálogo tenía ese día, no el de la caja concreta que se vendió: si hay dos lotes del mismo
producto comprados a precios distintos, los dos renglones guardan el mismo costo. Y si el
producto no tenía costo capturado el día de la venta, el renglón se queda sin costo y el
reporte cae al del catálogo, con la misma deriva de antes.

---

## Las tres tarifas

Son excluyentes: un ticket se cobra con una sola. La columna **Tarifa** aparece en los dos
archivos.

| Tarifa | Qué precio se aplica | Cargo adicional |
|---|---|---|
| **Mostrador** | Precio de lista. Es la venta normal. | Ninguno. |
| **Lymbika+** | Precio preferente de socio. | Si paga con tarjeta, **3 %** de recargo en la terminal. |
| **Proveedor** | Precio de proveedor **con el management fee del 10 % ya dentro**. | Ninguno al final del ticket. |

Las ventas anteriores a que existieran estas tarifas aparecen como **Mostrador**, que es la
lectura correcta: en ese entonces todo se cobraba a precio de lista.

**Lymbika+** es la membresía, que antes se llamaba **Health Pass**. Los archivos descargados
antes del cambio de nombre dicen *Health Pass*; es la misma tarifa. El nombre se cambia en
Strapi (*Site Config → membershipName*) y el reporte usa el que esté vigente al descargar.

En la tarifa Proveedor el fee **no es un cargo al final**: multiplica el precio de cada
producto, y como el precio incluye IVA, el fee carga el impuesto de su propia línea. En el
carrito se ve con un badge `+10 % fee` por producto. Los tickets emitidos antes de este
cambio sí lo llevaban como cargo aparte, y por eso existe la columna **Fee en el precio**.

El fee **no se aplica a líneas con precio tecleado a mano** por el cajero: un precio escrito
a mano es final.

---

## Cómo cruzar los dos archivos de ventas

Toma un folio y suma la columna **Total cobrado** de sus renglones en el archivo por
producto. Debe dar el **Subtotal + IVA** de ese ticket en el archivo por venta:

```
Σ Total cobrado = Subtotal + IVA del ticket
```

Esta igualdad vale siempre y sin casos especiales, sin importar la época del fee, porque
`Subtotal + IVA` es la mercancía y `Σ Total cobrado` es la suma de sus renglones: antes el fee
quedaba fuera de los dos, hoy queda dentro de los dos.

El **recargo de tarjeta** no entra en este cruce: es un cargo de *la forma de pago*, no del
precio de la mercancía, y vive solo en el archivo por venta.

El management fee tampoco hay que sumarlo aparte. En los tickets de hoy ya viene dentro del
Total cobrado de cada renglón; en los anteriores al cambio se cobró al final y nunca estuvo
en los renglones. En ambos casos el cruce cierra sin tocarlo.

### Ejemplo: un ticket de tarifa Proveedor

Folio `00003`, pagado en efectivo. Un producto de precio de proveedor $100 al 8 %, que salió
en dos renglones porque se surtió de dos lotes distintos. El precio cobrado es
`100 × 1.10 = 110.00`, con el fee ya dentro.

**Archivo por producto** — las dos filas llevan `Fee en el precio = Sí`

| Producto | Cant. | Costo total | Subtotal | Impuestos | Total cobrado | Retorno |
|---|---:|---:|---:|---:|---:|---:|
| Paracetamol 500 mg | 2 | 200.00 | 203.70 | 16.30 | 220.00 | 20.00 |
| Paracetamol 500 mg | 1 | 100.00 | 101.85 | 8.15 | 110.00 | 10.00 |

**Archivo por venta**

| Folio | Tarifa | Subtotal | IVA | Management fee | Fee en el precio | Recargo | Total |
|---|---|---:|---:|---:|---|---:|---:|
| 00003 | Proveedor | 305.56 | 24.44 | 30.00 | Sí | 0.00 | 330.00 |

**El cruce**

```
Σ Total cobrado  = 220.00 + 110.00 = 330.00
Subtotal + IVA   = 305.56 +  24.44 = 330.00   ✓
```

Y el **Retorno** de los dos renglones suma `20.00 + 10.00 = 30.00`, que es exactamente el
management fee del ticket. Así se ve por qué en Proveedor el retorno *es* el fee.

El ticket cobró **330.00**, no 360.00: los 30.00 de fee ya venían dentro de los precios. Y
como el precio incluye IVA, el fee carga el impuesto de su propia línea — por eso el renglón
de una pieza declara 8.15 de IVA y no 7.41.

---

## Qué tan exacto es el archivo por producto vendido

Desde el 17/9/2026 el costo y la tasa de IVA se copian a la venta al cobrar, así que las
columnas son estables: exportar el mismo período dos veces da lo mismo.

Quedan dos salvedades, y las dos están explicadas arriba en *Qué cambió y desde cuándo*:

- **Ventas anteriores a esa fecha** no tienen el costo ni la tasa guardados, así que el reporte
  usa los del catálogo de hoy. Esas filas sí pueden cambiar entre una exportación y otra.
- **Dos lotes del mismo producto a precios distintos** guardan el mismo costo: se congela el
  del catálogo de ese día, no el de la caja concreta que se vendió.

El **Retorno** hereda las dos salvedades, porque sale de restar el costo al subtotal.

> **Para contabilidad sigue siendo mejor el archivo por venta.** Sus importes son los que
> quedaron grabados en el cobro y no se reconstruyen nunca. El archivo por producto es una
> herramienta de análisis.

---

## Compras

La sección **Compras** exporta su propio par, con la misma lógica que ventas: una fila por
documento, o una fila por mercancía.

| Comparación | **Por compra** | **Por producto comprado** |
|---|---|---|
| **Archivo** | `compras_….csv` | `compras-por-producto_….csv` |
| **Una fila es** | una compra registrada | un renglón recibido |
| **Qué detalla** | cuánto se le pagó a cada proveedor | qué entró, a qué costo y en qué lote |
| **Úsalo para** | cuadrar egresos | cuadrar contra la factura del proveedor |
| **Columnas** | 11 | 13 |

Igual que en ventas, la columna **Folio** es la que los une.

> **Las compras no se filtran por sucursal.** Se registran a nivel central, así que el
> selector de sucursal no las acota: si lo usas, el nombre del archivo lo deja claro con
> `_todas-las-farmacias` en vez de mentir con el nombre de la sucursal. El período y el
> operador sí aplican.

### Archivo por compra

Una fila por compra registrada. Las canceladas no aparecen. Las de total 0 sí, marcadas, para
que se puedan reconciliar.

| Columna | Qué contiene |
|---|---|
| Fecha | Fecha y hora en que se registró la compra. |
| Folio | Número de la compra, a cinco dígitos. Liga con el otro archivo. |
| Proveedor | A quién se le compró. |
| Operador | Usuario que capturó la compra. |
| Total | Lo que se pagó, **con** impuesto. |
| Productos | Cuántos artículos distintos trae. |
| Unidades | Piezas totales que entraron. |
| Costos registrados | **No** cuando la compra se capturó sin costos: su total es 0. |
| IVA registrado | Tasas presentes: `8%`, `16%`, `8% + 16%`, o **No** si ninguna se capturó. |
| Factura adjunta | Nombre del archivo de la factura, si se subió. |
| Notas | Comentario que se escribió al registrar. |

### Archivo por producto comprado

Una fila por **renglón**, no por producto: el mismo artículo comprado en dos lotes son dos
filas, cada una con su lote y su costo. Es la única vista donde se ve a qué precio entró cada
lote.

#### 1. De qué compra viene

Describen la compra completa, así que **se repiten en cada renglón del mismo folio**.

| Columna | Qué contiene |
|---|---|
| Fecha | Fecha y hora de la compra. |
| Folio | Compra a la que pertenece el renglón. |
| Proveedor | A quién se le compró. |
| Operador | Usuario que capturó la compra. |

#### 2. Qué entró

| Columna | Qué contiene |
|---|---|
| Producto | Nombre con el que se capturó, **no** el del catálogo: si el producto se renombró después, la compra conserva el nombre con el que entró. |
| Cantidad | Piezas de ese renglón. |
| Lote | Número de lote. Vacío si no se capturó. |
| Caducidad | Caducidad de ese lote. Vacía si no se capturó. |

#### 3. Lo que costó

| Columna | Qué contiene |
|---|---|
| Costo unitario | Lo que costó una pieza, **sin** impuesto. |
| Importe | Cantidad × costo unitario. Sin impuesto. |
| Tasa IVA | `IVA 8 %`, `IVA 16 %` o `Exento`. Vacía en compras anteriores a que se capturara la tasa. |
| IVA | Impuesto de ese renglón. |
| Total línea | Lo que costó el renglón **con** impuesto. |

### Las sumas que siempre deben cerrar

```
Cantidad × Costo unitario = Importe
Importe + IVA             = Total línea
Σ Total línea de un folio = Total de esa compra
```

La última cierra **al centavo**, y no por suerte: el importe y el impuesto se redondean
renglón por renglón antes de sumarse, que es como el CFDI del proveedor redondea cada
concepto. Si una compra no cuadra contra su factura, este archivo es donde se ve qué concepto
difiere.

> **Cuidado al comparar un costo contra el de ventas**
>
> El costo de este archivo es el de **esa compra**. El `Costo unitario` del archivo por
> producto vendido es el que el producto tenía marcado **el día de la venta**, que viene de su
> última compra hasta ese momento. No tienen por qué coincidir: si el proveedor cambió el
> precio entre una compra y otra, difieren, y las dos cifras son correctas.

---

## Casos que verás seguido

- **Celdas vacías en costo y retorno.** El renglón es un servicio, o el producto no tenía
  costo capturado ni el día de la venta ni hoy. Se dejan en blanco a propósito, no en cero: un
  cero se leería como una venta que no dejó nada.
- **Consultas y servicios médicos.** Nunca tienen costo. Su IVA es fijo de 8 %, ya incluido en
  la tarifa.
- **Retorno en cero en Lymbika+.** Es lo correcto: en esa tarifa se vende al costo de
  proveedor, sin margen.
- **Retorno negativo en Lymbika+, en ventas anteriores al 17/9/2026.** También es real,
  no un error del reporte. Ver la nota del archivo por producto.
- **En Proveedor, el Retorno es el 10 % del costo.** Es el management fee, que va dentro del
  precio. El monto a nivel ticket está en el archivo por venta.
- **Un mismo producto repetido en un folio.** Normal: la venta se surtió de más de un lote.
- **Efectivo USD.** Está en dólares sin convertir. Para pasarlo a pesos usa la columna Tipo de
  cambio de esa misma fila.
- **Compras y sucursal.** No se acotan por sucursal; el dashboard lo advierte con una
  etiqueta y el archivo lo dice en su nombre. Ver *Compras*.
- **El mismo producto repetido en una compra.** Normal: entró en más de un lote, y cada uno
  pudo costar distinto.
- **Tasa IVA vacía en una compra.** Se registró antes de que se capturara la tasa. Su total
  es el crudo que se tecleó, así que no sirve para contrastar contra la factura.

---

Si una suma que esta guía marca como obligatoria no cierra, repórtalo: es un error, no un
redondeo.
