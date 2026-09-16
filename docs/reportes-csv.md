# Reportes de ventas en CSV

Guía interna · Punto de Venta Lymbika

El dashboard exporta dos archivos de ventas. No son uno resumido y otro detallado: son la
misma información vista a dos alturas distintas. Esta guía explica cuál bajar, qué significa
cada columna y qué cifras se pueden auditar al centavo.

---

## Dónde están y qué alcance tienen

Entra al **Panel de administración → Dashboard**. En el encabezado de la sección **Ventas**
hay dos botones de descarga. Más abajo, la sección **Compras** tiene el suyo aparte, que no
cubre esta guía. La página `/admin/compras` no exporta nada: todo sale del Dashboard.

Los dos archivos respetan **los filtros que tengas activos** en ese momento: el período (Hoy,
Semana, Mes, Todo o un rango del calendario), la sucursal y el operador. Lo que ves en
pantalla es exactamente lo que se descarga.

El nombre del archivo deja constancia de esos filtros, para que no se confundan dos descargas
distintas:

```
ventas_2026-08-11_2026-08-18_centro_ana.csv
```

- Las ventas **canceladas nunca aparecen** en ningún reporte.
- Si el período es muy largo, el dashboard avisa en pantalla que solo cargó las 5 000 ventas
  más recientes. Si ves ese aviso, parte el rango en tramos más cortos.

---

## Cuál de los dos bajar

La diferencia está en qué representa una fila.

| | `ventas_….csv` | `ventas-por-producto_….csv` |
|---|---|---|
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
| Tarifa | Mostrador, Health Pass o Proveedor. Ver la sección de tarifas. |
| Método de pago | Efectivo, tarjeta, transferencia o mixto. |
| Subtotal | Mercancía sin impuesto. |
| IVA | Impuesto de todo el ticket. |
| Management fee | El 10 % de la tarifa Proveedor. Ver la columna siguiente antes de sumarlo. |
| Fee en el precio | **Sí**: el fee ya está dentro de Subtotal + IVA. **No**: se cobró aparte y sí se suma. Vacío si el ticket no lleva fee. |
| Recargo tarjeta | 3 % que paga un cliente Health Pass al pagar con tarjeta. |
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

## Archivo por producto

Una fila por producto vendido. Es el archivo de márgenes.

Van agrupadas por bloque, y dentro de cada bloque en el orden en que se encadena la
aritmética, para que las sumas se lean de izquierda a derecha sin saltar columnas.

| Columna | Qué contiene | Confianza |
|---|---|---|
| **De qué ticket viene** | | |
| Fecha | Fecha y hora del ticket. | Exacto |
| Folio | Ticket al que pertenece el renglón. | Exacto |
| Método de pago | Del ticket completo, por eso se repite en cada renglón. | Exacto |
| Tarifa | Del ticket completo. También se repite. | Exacto |
| Fee en el precio | Igual que en el otro archivo. También se repite. | Exacto |
| **Qué se vendió** | | |
| Producto | Nombre del producto o del servicio. | Exacto |
| Cantidad | Piezas vendidas en ese renglón. | Exacto |
| **Lo que costó** | | |
| Costo unitario | Lo que nos costó una pieza, sin impuesto. | Aproximado |
| Costo total | Cantidad × costo unitario. | Aproximado |
| **Lo que se cobró** | | |
| Precio de venta | Precio unitario **sin impuesto**. | Aproximado |
| Subtotal | Cantidad × precio de venta. Sin impuesto. | Aproximado |
| Impuestos | IVA de ese renglón. | Aproximado |
| Total cobrado | Lo que pagó el cliente por ese renglón. **Ojo: no es `Costo total`.** | Exacto |
| **La conclusión** | | |
| Retorno | Qué dejó el renglón. La fuente cambia con la tarifa — ver la nota de abajo. | Según la tarifa |

### Las sumas que siempre deben cerrar

```
Precio de venta × Cantidad = Subtotal
Subtotal + Impuestos       = Total cobrado
Cantidad × Costo unitario  = Costo total
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
> Contesta *qué dejó este renglón*, y de dónde sale la cifra depende de la tarifa. No es un
> capricho: en dos de las tres el precio de venta se deriva del mismo precio de proveedor que
> el reporte usa como costo, así que restar ahí no mediría el negocio.
>
> | Tarifa | Qué trae el Retorno | Exactitud |
> |---|---|---|
> | **Mostrador** | El margen de mercancía (Subtotal − Costo total) | Corrido hacia abajo, ver abajo |
> | **Proveedor** | El management fee de ese renglón | **Exacto** |
> | **Health Pass** | **0.00** — cero por diseño | **Exacto** |
>
> Un retorno de **cero en Health Pass no es una venta a pérdida**: en esa tarifa se vende al
> precio de proveedor, y lo que deja el programa (cuota, volumen, recurrencia) no se mide en
> esta línea.
>
> **Limitación en Mostrador.** Ahí el Retorno sale corrido hacia abajo por el IVA del costo,
> porque el Subtotal es **neto** y el Costo es **crudo**. Sirve para **comparar productos
> entre sí**, pero no tomes la cifra como utilidad exacta. Está en revisión.

---

## Las tres tarifas

Son excluyentes: un ticket se cobra con una sola. La columna **Tarifa** aparece en los dos
archivos.

| Tarifa | Qué precio se aplica | Cargo adicional |
|---|---|---|
| **Mostrador** | Precio de lista. Es la venta normal. | Ninguno. |
| **Health Pass** | Precio preferente de socio. | Si paga con tarjeta, **3 %** de recargo en la terminal. |
| **Proveedor** | Precio de proveedor **con el management fee del 10 % ya dentro**. | Ninguno al final del ticket. |

Las ventas anteriores a que existieran estas tarifas aparecen como **Mostrador**, que es la
lectura correcta: en ese entonces todo se cobraba a precio de lista.

En la tarifa Proveedor el fee **no es un cargo al final**: multiplica el precio de cada
producto, y como el precio incluye IVA, el fee carga el impuesto de su propia línea. En el
carrito se ve con un badge `+10 % fee` por producto. Los tickets emitidos antes de este
cambio sí lo llevaban como cargo aparte, y por eso existe la columna **Fee en el precio**.

El fee **no se aplica a líneas con precio tecleado a mano** por el cajero: un precio escrito
a mano es final.

---

## Cómo cruzar los dos archivos

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

## Qué significa "aproximado"

Cinco columnas del archivo por producto se **reconstruyen** al momento de exportar, porque el
sistema no las guarda renglón por renglón. Son confiables para analizar tendencias y decidir,
pero no son un documento fiscal.

**Costo unitario y Costo total** usan el *costo que el producto tiene hoy* en el catálogo,
que se actualiza cada vez que registras una compra con costo. Si compraste ese producto más
caro o más barato *después* de esa venta, el reporte muestra el costo de hoy, no el de aquel
día.

**Precio de venta, Subtotal e Impuestos** usan la *tasa de IVA que el producto tiene hoy*. Si
el cajero corrigió la tasa a mano en esa venta puntual, esa corrección no quedó guardada, así
que el renglón puede no coincidir centavo a centavo con el ticket impreso.

El **Retorno** hereda las dos cosas, pero solo en **Mostrador**: ahí sale de restar el costo
al subtotal. En Proveedor y Health Pass es exacto, porque no depende del costo ni de la tasa.

> **Para contabilidad, usa el archivo por venta.** Todas sus columnas son exactas. El archivo
> por producto es una herramienta de análisis.

---

## Casos que verás seguido

- **Celdas vacías en costo y retorno.** El producto no tiene costo capturado, o el renglón
  es un servicio. Se dejan en blanco a propósito, no en cero: un cero se leería como una
  venta que no dejó nada.
- **Consultas y servicios médicos.** Nunca tienen costo. Su IVA es fijo de 8 %, ya incluido en
  la tarifa.
- **Retorno en cero en Health Pass.** Es lo correcto, no un error: en esa tarifa se vende al
  precio de proveedor y el retorno de la línea es cero por diseño.
- **En Proveedor, el Retorno es el management fee.** También es lo correcto: en esa tarifa
  el retorno de la venta *es* el 10 %. El monto del fee a nivel ticket está en el archivo
  por venta.
- **Un mismo producto repetido en un folio.** Normal: la venta se surtió de más de un lote.
- **Efectivo USD.** Está en dólares sin convertir. Para pasarlo a pesos usa la columna Tipo de
  cambio de esa misma fila.
- **Compras y sucursal.** Las compras se registran a nivel central, así que el filtro de
  sucursal no las acota. El dashboard lo advierte con una etiqueta cuando eliges una sucursal.

---

Si una suma que esta guía marca como obligatoria no cierra, repórtalo: es un error, no un
redondeo.
