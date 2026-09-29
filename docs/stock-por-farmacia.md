# Stock por farmacia — resumen del trabajo

*28-sep-2026*

El POS ahora lleva el stock **por farmacia y por lote**, y todo movimiento de stock lo hace el
**backend en una transacción**. Se acabaron las pisadas entre cajas y los descuadres por
escrituras a medias.

Detalle técnico del flujo de venta: [flujo-venta.md](flujo-venta.md).

---

## 1. Antes y por qué se cambió

Había un solo número de stock por producto (`stock_central`), y el navegador lo sobrescribía en
cada venta, compra o ajuste. Eso causaba cinco problemas:

| Problema | Qué pasaba |
|---|---|
| Pisadas entre cajas | Dos cajas vendiendo el mismo producto calculaban desde el mismo número viejo; una borraba el descuento de la otra. |
| Escrituras a medias | La venta se guardaba pero el stock o el lote no, sin rollback. |
| Productos re-publicados | Cada cambio de stock por la API publicaba el borrador completo del producto. |
| Sin farmacias | Las farmacias solo eran una etiqueta: no se sabía cuánto había en cada una. |
| Devoluciones sin efecto | Las devoluciones no regresaban el stock, porque la venta llegaba sin su producto. |

---

## 2. El modelo nuevo

`stock_central` es ahora el **total** del producto. Cada farmacia tiene su propio stock, y la
bodega es lo que sobra: **total = bodega + farmacias**, siempre.

| Qué | Dónde vive en Strapi |
|---|---|
| Total del producto | `product.stock_central` |
| Stock de cada farmacia | Colección **Pharmacy Stock**: una fila por producto y farmacia |
| Bodega central | **No se guarda**: se calcula como total − farmacias |
| Lotes | Colección **inventoryLot**; el campo `pharmacy` dice dónde está (vacío = bodega) |
| Bitácora de movimientos | Colección **Stock Operation**: una fila por operación |
| Traspasos | Colección **Stock Transfer**: una fila por porción movida |

- Un movimiento en un lugar (venta, compra, devolución, merma, corrección) cambia **ese lugar y
  el total**.
- Un **traspaso** resta del origen y suma al destino: **el total no cambia**.
- Si un traspaso mueve parte de un lote, el lote queda en **dos registros** con el mismo número y
  la misma caducidad, uno por lugar. `source_lot` apunta al original.
- En cada lugar lo ideal es **stock = suma de sus lotes**. La diferencia es mercancía "sin lote"
  y se ve en Stock por farmacia.

---

## 3. Descuento de stock en la venta

1. **Agregar al carrito.** La caja ve el stock y los lotes **de su farmacia**. Si no hay stock,
   avisa pero deja vender. Con un solo lote vendible lo toma solo; con varios, pregunta cuál.
2. **Cantidad.** Se cambia con − / + o escribiéndola. **No hay tope**: si pasa lo que tiene el
   lote o la farmacia, la línea lo avisa en ámbar.
3. **Cobrar → registrar la venta.** Si falla, se cancela todo: no se descuenta nada ni se imprime
   ticket.
4. **Descontar en el servidor** (`/pos-stock/sale`), en una sola transacción:
   - la farmacia y el total bajan la cantidad vendida (pueden quedar en **negativo**, con aviso);
   - primero sale del lote elegido; si no alcanza, de los otros lotes de esa farmacia, empezando
     por el que caduca antes; lo que no alcance se vende **sin lote**;
   - un lote nunca queda negativo; al llegar a 0 pasa a `agotado`.
5. **Si el paso 4 falla** (red caída), la venta ya está guardada: el descuento queda en una **cola
   de pendientes** y se reintenta al abrir el POS y tras cada venta. **Nunca se descuenta dos
   veces**, porque cada operación tiene una llave única.
6. **Ticket.** Se imprime con el lote y la caducidad de cada línea.

---

## 4. Movimientos de stock

| Movimiento | Dónde se hace | Lugar | Total | Lotes |
|---|---|---|---|---|
| Venta | Caja | Baja la farmacia de la caja | Baja | Baja el lote vendido (por caducidad si no alcanza) |
| Devolución | Historial de Ventas → Devolver | Sube la farmacia de la caja (o la de la venta) | Sube | No regresa a lote |
| Compra | Compras → "Entra a" | Sube bodega o la farmacia elegida | Sube | Crea un lote por renglón con número |
| Traspasar | Traspasos, o botón en Stock por farmacia | Baja origen, sube destino | **No cambia** | Viajan con la mercancía |
| Cuadrar | Stock por farmacia | Queda igual a lo contado | Cambia en la diferencia | Cada lote queda con lo contado |
| Corregir | Stock por farmacia | Sube o baja | Cambia igual | Si eliges un lote, baja o sube junto |
| Desechar | Caducidades | Baja la ubicación del lote | Baja | El lote pasa a `vencido` |

**Regla de uso:**
- **Traspasar** cuando la mercancía ya existe y solo cambia de lugar.
- **Cuadrar** cuando contaste físicamente.
- **Corregir** solo para pérdidas o faltantes reales.

---

## 5. Pantallas del admin

| Pantalla | Estado | Qué hace |
|---|---|---|
| Stock por farmacia | **Nueva** | Stock por ubicación y vista **Todas las ubicaciones** (descuadres lugar por lugar, resumen, enlaces a Strapi). Botones Traspasar, Cuadrar y Corregir. |
| Traspasos | **Nueva** | Mover mercancía entre ubicaciones, con lote opcional; historial por traspaso. |
| Reconciliación | **Eliminada** | Su contenido pasó a Stock por farmacia → Todas las ubicaciones. |
| Compras | Cambiada | Selector "Entra a" (bodega o farmacia). |
| Caducidades | Cambiada | Columna y filtro de ubicación; el stock mostrado y la vista previa de la merma son los de la ubicación del lote. |
| Productos | Cambiada | "Stock total" de solo lectura; enlaza a Stock por farmacia. |
| Historial de Ventas | Cambiada | Ya no descarga el catálogo completo; las devoluciones sí regresan stock. |
| Menú | Cambiado | Agrupado en **Ventas** e **Inventario**. |

En la caja: la tarjeta muestra el stock de su farmacia ("sin stock en esta farmacia", "bajo
mínimo"), la cantidad del carrito se puede escribir, y los errores de permisos o de red se
explican con claridad.

---

## 6. Backend (backend-ecommerce)

**Endpoints nuevos** en `/api/pos-stock/`. Todos requieren sesión y son transaccionales:

| Endpoint | Para qué |
|---|---|
| `POST /sale` | Descontar una venta |
| `POST /return` | Regresar una devolución |
| `POST /purchase` | Ingresar una compra al destino elegido |
| `POST /transfer` | Traspaso entre ubicaciones |
| `POST /adjust` | Corregir stock o un lote |
| `POST /count` | Cuadrar (conteo físico por lote) |
| `POST /discard-lot` | Desechar lotes |
| `GET /levels` | Stock y lotes de una ubicación |

**Cambios en colecciones:**
- inventoryLot: `pharmacy` (ubicación) y `source_lot` (de qué lote salió).
- Pharmacy Stock: `pairKey` (garantiza una sola fila por producto y farmacia).
- compra-pos: `destination_pharmacy`.
- Stock Transfer: `from_lot`, `to_lot` y `batchId`.
- Colección nueva **Stock Operation** (bitácora).

**Otros:**
- Al arrancar, el backend crea los índices únicos de Pharmacy Stock y Stock Operation.
- `stock_central` se escribe directo en la base, así que **ya no re-publica** el producto.
- Se agregaron y luego se **quitaron** `venta-pos.pharmacy`, `devolucion-pos.pharmacy` y
  `caja-pos.farmacia`: duplicaban `pharmacies` y `pharmacy`, que ya funcionaban.

---

## 7. Decisiones tomadas

| Decisión | Por qué |
|---|---|
| `stock_central` = total de todo | Es el número contra el que se cuadran los lotes; sigue significando lo mismo que antes. |
| La bodega se calcula, no se guarda | Un tercer número guardado podría descuadrarse; calculado, cuadra siempre. |
| Lotes por ubicación | Para saber qué lote hay en cada farmacia y que la caja solo venda los suyos. |
| Vender sin stock: avisar pero permitir | No bloquear la caja; el negativo se corrige después. |
| Traspasos inmediatos | Sin estado "en tránsito": sale y entra al momento. |
| Toda escritura en el backend | Transacción y bloqueo de filas: sin pisadas ni fallos a medias. |
| Sin modo "legacy" | Con el modelo de total no hacía falta el interruptor. |
| Acomodar farmacias a mano | Con traspasos desde bodega, en lugar de una migración automática. |
| La devolución no regresa a lote | Decisión para mantenerlo simple; genera un descuadre visible. |
| Corregir un lote siempre mueve el stock | La opción "solo el lote" creaba descuadres; para eso está Cuadrar. |

---

## 8. Puesta en marcha

- [ ] Desplegar backend y POS.
- [ ] En Strapi → Settings → Users & Permissions → Roles → **Authenticated**, habilitar todas las
      acciones de **Pos-stock** (incluida `count`), **Pharmacy-stock → find**,
      **Stock-transfer → find** e **Inventory-lot → find**.
- [ ] Revisar los mínimos (`min_stock`) de Pharmacy Stock.
- [ ] Al inicio todo el stock está contado como bodega y las farmacias en 0. Por cada farmacia,
      **antes de vender** o lo antes posible: **Traspasar** desde bodega lo que tiene en anaquel,
      eligiendo el lote cuando se sepa.
- [ ] Revisar Stock por farmacia → Todas las ubicaciones → **Descuadres** y resolver con **Cuadrar**.

---

## 9. Límites conocidos y pendientes

1. **Vender sin stock se permite.** Las unidades vendidas sin lote dejan un descuadre entre stock
   y lotes; se ve en *Descuadres* y se resuelve con Cuadrar.
2. **La devolución no regresa a lote.** También deja descuadre en esa ubicación.
3. **El catálogo de la caja es una foto.** No ve las ventas de otras cajas hasta recargar. No
   daña el stock (lo calcula el servidor); solo el número mostrado puede ir atrasado.
4. **La cola de pendientes es por navegador.** Si esa caja no vuelve a abrir el POS, sus pendientes
   no se reintentan desde otra.
5. **Caducidad en UTC en la caja.** Después de las 18:00 la caja puede ocultar un lote que vence ese
   día unas horas antes que el servidor.
6. **Editar precio o IVA de un producto** sigue re-publicando su borrador en Strapi. El stock ya no.
