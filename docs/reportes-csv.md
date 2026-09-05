# Reportes de ventas en CSV

Guía interna · Punto de Venta Lymbika

El dashboard exporta dos archivos de ventas. No son uno resumido y otro detallado: son la
misma información vista a dos alturas distintas. Esta guía explica cuál bajar, qué significa
cada columna y qué cifras se pueden auditar al centavo.

---

## Dónde están y qué alcance tienen

Entra al **Panel de administración → Dashboard**. En el encabezado de la sección **Ventas**
hay dos botones de descarga.

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
| **Columnas** | 18 | 14 |

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
| Management fee | 10 % sobre la mercancía. Solo en tickets de tarifa Proveedor. |
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

```
Subtotal + IVA + Management fee + Recargo tarjeta = Total
```

Las cuatro columnas están juntas y en ese orden, antes del Total, justamente para que puedas
verificarlo de un vistazo. Si alguna fila no cierra, es un error que hay que reportar.

---

## Archivo por producto

Una fila por producto vendido. Es el archivo de márgenes.

| Columna | Qué contiene | Confianza |
|---|---|---|
| Fecha | Fecha y hora del ticket. | Exacto |
| Folio | Ticket al que pertenece el renglón. | Exacto |
| Método de pago | Del ticket completo, por eso se repite en cada renglón. | Exacto |
| Tarifa | Del ticket completo. También se repite. | Exacto |
| Producto | Nombre del producto o del servicio. | Exacto |
| Cantidad | Piezas vendidas en ese renglón. | Exacto |
| Precio de venta | Precio unitario **sin impuesto**. | Aproximado |
| Costo unitario | Lo que nos costó una pieza, sin impuesto. | Aproximado |
| Costo total | Cantidad × costo unitario. | Aproximado |
| Subtotal | Cantidad × precio de venta. Sin impuesto. | Aproximado |
| Impuestos | IVA de ese renglón. | Aproximado |
| Total | Lo que pagó el cliente por ese renglón. | Exacto |
| Management fee | Parte del fee del ticket que le toca a este renglón. | Exacto |
| Margen | Subtotal − Costo total. Solo mercancía, sin el fee. | Aproximado |

### Las sumas que siempre deben cerrar

```
Precio de venta × Cantidad = Subtotal
Subtotal + Impuestos       = Total
Subtotal − Costo total     = Margen
```

> **No sumes estas columnas**
>
> **Método de pago** y **Tarifa** describen el ticket, no el renglón, así que se repiten en
> cada producto del mismo folio. Sirven para filtrar o para una tabla dinámica, no para
> totalizar. Para totales por método de pago usa el archivo por venta.
>
> En ventas **mixtas** la columna solo dice *mixto*: no hay forma de saber qué producto se
> pagó con qué. El desglose está en el archivo por venta.

---

## Las tres tarifas

Son excluyentes: un ticket se cobra con una sola. La columna **Tarifa** aparece en los dos
archivos.

| Tarifa | Qué precio se aplica | Cargo adicional |
|---|---|---|
| **Mostrador** | Precio de lista. Es la venta normal. | Ninguno. |
| **Health Pass** | Precio preferente de socio. | Si paga con tarjeta, **3 %** de recargo en la terminal. |
| **Proveedor** | Precio de proveedor. | **Management fee del 10 %** sobre la mercancía. |

Las ventas anteriores a que existieran estas tarifas aparecen como **Mostrador**, que es la
lectura correcta: en ese entonces todo se cobraba a precio de lista.

---

## Cómo cruzar los dos archivos

Toma un folio y suma sus renglones en el archivo por producto. Debe dar el total del ticket
**menos el recargo de tarjeta**:

```
Σ Total + Σ Management fee = Total del ticket − Recargo tarjeta
```

El recargo queda fuera a propósito: es un cargo de *la forma de pago*, no del precio de la
mercancía, así que vive únicamente en el archivo por venta. El management fee sí entra,
porque es parte de lo que cuesta la tarifa de proveedor.

### Ejemplo: un ticket de tarifa Proveedor

Folio `00003`, pagado en efectivo. El mismo producto salió en dos renglones porque se surtió
de dos lotes distintos.

**Archivo por producto**

| Producto | Cant. | Subtotal | Impuestos | Total | Fee | Margen |
|---|---:|---:|---:|---:|---:|---:|
| Paracetamol 500 mg | 2 | 200.00 | 16.00 | 216.00 | 21.60 | 124.00 |
| Paracetamol 500 mg | 1 | 100.00 | 8.00 | 108.00 | 10.80 | 62.00 |

**Archivo por venta**

| Folio | Tarifa | Subtotal | IVA | Fee | Recargo | Total |
|---|---|---:|---:|---:|---:|---:|
| 00003 | Proveedor | 300.00 | 24.00 | 32.40 | 0.00 | 356.40 |

**El cruce**

```
(216.00 + 21.60) + (108.00 + 10.80) = 356.40
300.00 + 24.00 + 32.40 + 0.00       = 356.40   ✓
```

---

## Qué significa "aproximado"

Seis columnas del archivo por producto se **reconstruyen** al momento de exportar, porque el
sistema no las guarda renglón por renglón. Son confiables para analizar tendencias y decidir,
pero no son un documento fiscal.

**Costo unitario, Costo total y Margen** usan el *costo que el producto tiene hoy* en el
catálogo, que se actualiza solo cada vez que registras una compra con costo. Si compraste ese
producto más caro o más barato *después* de esa venta, el reporte muestra el costo de hoy, no
el de aquel día.

**Precio de venta, Subtotal e Impuestos** usan la *tasa de IVA que el producto tiene hoy*. Si
el cajero corrigió la tasa a mano en esa venta puntual, esa corrección no quedó guardada, así
que el renglón puede no coincidir centavo a centavo con el ticket impreso.

> **Para contabilidad, usa el archivo por venta.** Todas sus columnas son exactas. El archivo
> por producto es una herramienta de análisis.

---

## Casos que verás seguido

- **Celdas vacías en costo y margen.** El producto no tiene costo capturado, o el renglón es
  un servicio. Se dejan en blanco a propósito: poner cero haría ver una utilidad del 100 %.
- **Consultas y servicios médicos.** Nunca tienen costo. Su IVA es fijo de 8 %, ya incluido en
  la tarifa.
- **El margen no incluye el management fee.** Está en su propia columna. Si quieres la
  ganancia total del renglón, suma las dos.
- **Un mismo producto repetido en un folio.** Normal: la venta se surtió de más de un lote.
- **Efectivo USD.** Está en dólares sin convertir. Para pasarlo a pesos usa la columna Tipo de
  cambio de esa misma fila.
- **Compras y sucursal.** Las compras se registran a nivel central, así que el filtro de
  sucursal no las acota. El dashboard lo advierte con una etiqueta cuando eliges una sucursal.

---

Si una suma que esta guía marca como obligatoria no cierra, repórtalo: es un error, no un
redondeo.
