# Optimización de la carga del catálogo (POS y admin)

Documento del **trabajo realizado** el 2-3 de septiembre de 2026 sobre cómo se carga,
filtra y pinta el catálogo de productos, más el estado en que queda el POS y lo que
sigue pendiente.

Punto de partida: **1 777 productos**, 72 tarifas de servicio, 9 categorías. Toda
consulta al backend bajaba el catálogo completo con `populate=*`.

---

## 1. Resumen en una línea

Ninguna pantalla necesitaba las 1 777 filas que descargaba. La tabla de admin ahora pide
una página al servidor; los autocompletados buscan en el backend; y el POS —que sí
necesita el catálogo en memoria para buscar sin red— lo descarga recortado, lo pinta de
48 en 48 y lo indexa una sola vez.

| | Antes | Ahora |
|---|---|---|
| `/admin/productos` | 4.64 MB | 9.7 KB por página |
| Autocompletado de facturas y compras | 4.64 MB al montar | 1.6 KB por búsqueda |
| POS (payload) | 4.64 MB | 1.11 MB |
| POS (bitmaps en RAM) | ~113 MB | ~3 MB |
| POS (coste por pulsación) | 2.0 ms + 0.8 MB de basura | 0.4 ms + ~0 |

---

## 2. `/admin/productos` — paginación en servidor

### El problema

[`products-table.tsx`](../src/components/admin/products-table.tsx) recibía el catálogo
entero y paginaba de 20 en 20 **en cliente**. La página llamaba a `useGetProducts()`
(`populate=*`, `pageSize=5000`) para mostrar 20 filas.

### La solución

Hook nuevo: [`useGetProductsPage`](../src/api/getProductsPage.ts). Pide **una página** y
resuelve búsqueda, categoría y estado **en Strapi**.

Los filtros se componen como grupos dentro de `$and`, y no como claves sueltas:

```
filters[$and][0][$or][0][productName][$containsi]=…   ← búsqueda
filters[$and][0][$or][1][sal][$containsi]=…
filters[$and][1][category][categoryName][$eq]=…       ← categoría
filters[$and][2][$or][0][active][$eq]=false           ← "inactivos"
filters[$and][2][$or][1][active][$null]=true
```

El anidamiento importa: el `$or` de la búsqueda y el de "inactivo" se pisarían la clave
en el query string si fueran los dos de primer nivel. La rama `$null` reproduce el
`!p.active` que hacía el filtro en cliente.

Dos detalles que pesan tanto como paginar:

- **`fields` explícitos** en lugar de `populate=*`, que arrastraba los `inventory_lots`
  de cada producto — decenas de filas por producto que la tabla no lee.
- **`AbortController`**: al teclear se cancela la petición anterior, para que una
  respuesta vieja no pise a la nueva.

### Medición (contra el backend real)

| | bytes | tiempo |
|---|---|---|
| Antes (`populate=*`, `pageSize=5000`) | 4 642 791 | 4.82 s |
| Ahora (página de 20) | 9 698 | 0.71 s |

### UI

`Pagination` de shadcn en un pie, selector de filas por página (20/50/100),
"Mostrando X–Y de N", skeleton en la primera carga, tabla atenuada al recargar y
buscador con debounce de 300 ms.

El desplegable de categorías ya no se deriva del catálogo: `useGetCategoryNames()` en
[`getCategories.ts`](../src/api/getCategories.ts) pide solo los 9 nombres (~200 bytes).

### Bug encontrado y corregido

Una búsqueda sin resultados devuelve `pageCount: 0`, lo que hacía que el ajuste de página
pidiera `pagination[page]=0`. El hook ahora pone piso en 1.

### Menú de orden

`DropdownMenu` de shadcn (traído con `npx shadcn add dropdown-menu`) con 4 campos ×
2 sentidos. Los sentidos se nombran según el campo: "A → Z" en nombre, "Menor a mayor" en
precio. El orden por defecto sigue siendo `createdAt:desc`, el que ya tenía la tabla.

### Limitación conocida: los NULL

**310 productos (17 %) no tienen `stock_central`** y 2 no tienen `price`. Postgres coloca
los NULL en un extremo fijo y **Strapi ignora `sort=…:desc:nullsLast`** (comprobado:
responde 200 y los sigue poniendo primero). Ordenar "Stock, mayor a menor" abriría con
~15 páginas de "—".

Decisión tomada: **no tocar los datos**. Al ordenar por precio o stock se excluyen los
vacíos y la tabla lo avisa en pantalla. Está aislado en `NULLABLE_SORT_FIELDS`
([getProductsPage.ts:28](../src/api/getProductsPage.ts#L28)) — borrar esa lista revierte
el comportamiento.

Queda una asimetría: bajo el criterio "null = 0", el orden *mayor a menor* es correcto
(esos 310 irían al final igualmente), pero *menor a mayor* no muestra justo los que más
interesan. Se resolvería escribiendo `0` en esos 310 productos; hay respaldo de la lista
(78 activos, 232 inactivos) generado durante el trabajo.

---

## 3. Facturas y compras — búsqueda en backend

Los dos autocompletados tenían el mismo patrón: `.filter()` sobre las 1 777 filas y
`.slice(0, 8)`. Ambos comparten ahora
[`useSearchProducts`](../src/api/searchProducts.ts): búsqueda en Strapi con debounce de
300 ms y `AbortController`, sobre `productName`, `sal`, `sku` y `barCode`.
**1.6 KB por búsqueda, y solo al escribir.**

- [`invoice-form.tsx`](../src/components/admin/invoice-form.tsx): `LineRow` perdió la
  prop `products`, y con ella `InvoiceForm` entera.
- [`items-step.tsx`](../src/components/admin/purchase/items-step.tsx) y
  [`new-purchase-dialog.tsx`](../src/components/admin/new-purchase-dialog.tsx): igual.

Como los resultados dejan de ser instantáneos, los desplegables muestran "Buscando…" /
"Sin resultados", pero **mantienen los resultados previos a la vista** mientras llega la
siguiente búsqueda, para que no parpadeen al teclear.

### El riesgo que había que sortear

`handleConfirm` leía `stock_central` y `documentId` con
`products.find(p => p.id === item.productId)` antes de patchear el stock. Quitar el array
sin más habría hecho que ese `find` devolviera `undefined` y el `if (!product) continue`
**registrara la compra sin actualizar stock, en silencio**.

Se resolvió guardando `stockActual` en `LocalPurchaseItem`
([types.ts](../src/components/admin/purchase/types.ts)) en el momento de elegir el
producto. Dos efectos secundarios buenos:

- El stock que se lee es del resultado de búsqueda (segundos atrás) en vez del snapshot
  del montaje de la página: la ventana de carrera con las ventas del POS se achica.
- Desaparece el `continue` silencioso: todo ítem confirmado se patchea.

---

## 4. POS — `product-grid`

### El diagnóstico

[`product-grid.tsx`](../src/components/product-grid.tsx) era un `items.map()` sin techo:
pintaba todo lo que le dieran. Con categoría "todos" y el buscador vacío, **1 777
tarjetas montadas a la vez**. De ahí salían cuatro costos:

1. **~1 774 peticiones de imagen** al abrir (1 774 de los 1 777 productos tienen imagen),
   sin `loading="lazy"`. El navegador solo hace ~6 en paralelo por dominio.
2. **~1 774 spinners animando** en paralelo, uno por tarjeta.
3. **1 777 componentes con estado propio** (`useState(imageLoaded)`), cada imagen que
   llegaba disparaba un re-render.
4. **~30 000 nodos de DOM**, para un sidebar donde caben 6-12 tarjetas.

Y el grid no decía cuántos resultados había.

### R0 — carga diferida de imágenes

[`product-card.tsx`](../src/components/product-card.tsx): `loading="lazy"` +
`decoding="async"`, y **fuera el spinner por tarjeta**. Eso segundo no era opcional: con
`lazy`, una imagen fuera de pantalla no carga nunca, así que su spinner giraría para
siempre. El hueco lo ocupa `bg-muted`. De paso desaparece el `useState` de cada tarjeta.

Es el cambio con mejor relación impacto/riesgo de todo el trabajo: una imagen de 128×128
ocupa **64 KB de RAM una vez decodificada** (128 × 128 × 4 bytes), pese los 2.5 KB que
pese el archivo. 1 774 × 64 KB ≈ **113 MB**.

### R1 — paginación del grid

48 tarjetas por página (múltiplo de 2, 3, 4 y 6: el sidebar cambia de columnas según su
ancho y así la última fila no queda coja). `Pagination` de shadcn **pegada arriba**
(`sticky`), junto al contador de resultados, para cambiar de página sin rodar hasta el
final. Se añadió el estado "Sin resultados", que no existía.

La vuelta a la página 1 se dispara con un `filterKey` (búsqueda + código + categoría),
**no** con la identidad de `items`: esa cambia también al vender, y sacar al cajero de su
página tras cada venta sería molesto.

### P1 — recorte del payload

[`getProducts.ts`](../src/api/getProducts.ts) pasó de `populate=*` a `fields` y `populate`
explícitos. La regla: **se pide lo que declara `ProductType`, menos lo que ningún
consumidor lee**. Como en el repo no hay un solo `as any`, lo que no está en ese tipo es
ilegible para el código tipado.

De dónde salían los 4.64 MB:

| Campo | Peso | ¿Se usa? |
|---|---|---|
| `images` | 1.67 MB (34 %) | Sí, pero solo `url` |
| `descriptionPro` | 975 KB (20 %) | No |
| `category` | 693 KB (14 %) | Solo `categoryName` y `slug` |
| `clinics` | 390 KB (8 %) | No |
| `reviews`, `videos`, `priceInpatient`, `drug_type` | — | No |

Los `inventory_lots` se piden **explícitos** en vez de por `populate=*`, porque el POS los
necesita para el selector de lote. Verificado en uso: la selección de lote sigue
funcionando.

**Resultado: 4 642 791 → 1 114 540 bytes (−76 %).**

También se quitaron `sku` y `tipo` (nadie los lee; `tipo` no lo lee *nadie* en todo el
repo) y se marcaron opcionales en `ProductType` — dejar el tipo prometiendo un campo que
ya no llega es la clase de mentira que muerde después.

`createdAt` se devolvió al payload (+69 KB) porque sin él no hay orden por fecha en
cliente. Se prefirió pedirlo explícito antes que confiar en que el array llegue ordenado,
que sería un acoplamiento invisible con el `sort=` del propio hook.

### Índice de búsqueda

`normalize()` (minúsculas + quitar acentos) hace tres pasadas y tres strings temporales
por llamada. Corría sobre `productName` y `sal` de los 1 777 productos **en cada
pulsación**:

```
131 805 caracteres renormalizados por tecla
~10 662 strings temporales por tecla
~0.8 MB de basura por tecla  →  teclear "paracetamol" generaba ~8 MB
```

Eso no llena la RAM, pero fuerza pausas de GC — que es lo que se siente como tirones al
escribir. Ahora `normalize()` vive en [`lib/search.ts`](../src/lib/search.ts) y el
catálogo se indexa **una sola vez**; por pulsación solo se normaliza el término tecleado.

El índice se construye sobre `fetchedProducts` y **no** sobre `products`: vender solo
cambia el stock, los nombres no, así que el índice sobrevive a cada venta.

| Teclear "paracetamol" (11 pulsaciones) | Antes | Ahora |
|---|---|---|
| Filtrado total | 22.0 ms | 4.1 ms (+2.0 ms de índice, una vez) |
| Por pulsación | 2.0 ms | 0.4 ms |
| Basura generada | ~8 MB | ~0 |

**Verificación:** se implementaron las dos versiones y se corrieron sobre el catálogo real
comparando los ids devueltos. **11/11 casos idénticos**, incluyendo acentos ("niño"),
mayúsculas ("TEMPRA"), búsqueda vacía, código de barras, categoría y combinaciones.

### Menús de orden

Dos botones en la barra de resultados del grid, con el mismo componente
([`sort-menu.tsx`](../src/components/sort-menu.tsx)) y opciones distintas, porque cada tipo
tiene sus atributos: los servicios no tienen stock ni fecha de alta, los productos no
tienen duración. El grid los recibe por un slot `controls` y no como props sueltas, para
seguir sin saber qué se ordena ni cuándo se puede: eso vive en el sidebar, que es quien
tiene la categoría activa.

**`⇅ Mezclado`** → al elegir un orden pasa a **`⇅ Solo productos · A → Z`**

```
● Mezclado con consultas          ← por defecto
──────────────────────────────
Solo productos, ordenados por
○ Nombre   ○ Precio   ○ Stock   ○ Fecha de alta
──────────────────────────────
● A → Z          ○ Z → A         ← solo si hay campo elegido
```

**`🩺 Consultas`** → precio y duración.

Los dos menús son **excluyentes**: elegir un orden restringe la vista a ese tipo y esconde
el menú del otro. Son tres modos, y para volver al primero cada menú tiene su opción neutra
arriba:

| Estado | Botones a la vista | Qué se pinta |
|---|---|---|
| Nada elegido | `⇅ Mezclado` + `🩺 Consultas` | productos + consultas |
| Orden de productos | `⇅ Solo productos · A → Z` | solo productos |
| Orden de consultas | `🩺 Solo consultas · Menor a mayor` | solo consultas |

Hizo falta porque ordenar una lista mezclada no se veía: las consultas quedaban detrás de
los 1 777 productos, fuera de la primera página, y el orden no servía de nada.

La regla vive en una sola función, `gridMode()`, y no repartida entre `page.tsx` y
`product-sidebar.tsx`, que necesitan la misma respuesta —uno para armar la lista y el otro
para saber qué botón pintar—; duplicada se irían separando. Lleva tres guardas contra el
**callejón sin salida**, que es el riesgo real de este cambio: si los dos órdenes quedan
activos a la vez, los dos bloques se vacían, y como cada menú se esconde cuando el otro
manda, no queda ningún control para deshacerlo.

- `soloProductos` no aplica en la categoría "Consultas", donde no hay productos.
- `soloConsultas` cede ante `soloProductos` y solo cuenta donde hay consultas a la vista.
- Elegir un orden apaga el del otro tipo, para que no quede uno durmiente que se reactive
  solo al volver a "Mezclado".

Verificado con los 10 casos, incluidos los tres de "orden olvidado" al cambiar de
categoría: ninguno deja el grid vacío ni sin controles.

Comparadores y etiquetas viven juntos en [`lib/grid-sort.ts`](../src/lib/grid-sort.ts)
para que no se separen. **Lo vacío va siempre al final, en ambos sentidos**: un producto
sin precio no es "el más barato" ni "el más caro". Aquí se pudo porque el comparador es
nuestro; la tabla de admin ordena en Postgres y ahí no.

### Densidad de la cabecera

Los controles ocupaban cinco filas (buscador, tres renglones de chips de categoría, orden,
y contador con paginación). Quedaron en tres:

- **Las 11 categorías van en un carrusel de una sola fila**
  ([`category-filter.tsx`](../src/components/category-filter.tsx)) con desplazamiento
  horizontal y flechas que aparecen solo cuando hay a dónde ir. Las flechas van
  posicionadas en absoluto sobre los bordes: si ocuparan sitio en el flujo, aparecer y
  desaparecer movería los chips de lugar.
- **🩺 Consultas pasó a segunda posición**, justo tras "Todos". Al final quedaba fuera de
  la vista, y es el único chip que no es una categoría de producto.
- **Los menús de orden se mudaron a la fila del contador**, junto a las flechas de
  paginación.

### El POS solo carga consultas

`medical_service` tiene tres tipos en Strapi —`consultation` (44), `procedure` (27) y
`study` (1)— pero en el punto de venta solo se cobran consultas. Se filtra **en el
servidor** ([`getServiceRates.ts`](../src/api/getServiceRates.ts)):

```
filters[medical_service][type][$eq]=consultation
```

En el origen y no en cada vista, porque lo que no entra no hay que acordarse de esconderlo
después. Se estaban descargando los 27 procedimientos y el estudio con toda su metadata
para descartarlos en pantalla: el payload de tarifas baja de **240 KB a 122 KB (−49 %)**.

El filtro por tipo ya implica que hay `medical_service`, así que sustituye al `$notNull`
que había. Y deja borrar `excluirProcedimientos` y el `filter()` del contador del chip:
mezclado, chip 🩺 y "solo consultas" ven ahora las mismas 44 tarifas.

`service.ts` declaraba dos tipos cuando la API devuelve tres; ahora declara los tres, con
nota de que el POS solo carga el primero. Prometer una unión incompleta es lo que rompe un
`switch` exhaustivo meses después.

### Orden de productos y servicios

Los servicios van **siempre detrás** de los productos: los medicamentos son la prioridad.
Para llegar a las consultas se teclea el término completo, que deja pocos productos
casando y las sube a la primera página:

```
"dr"        154 productos casan  →  consultas en página 4
"dr "         0 productos casan  →  consultas en página 1
"consulta"    0 productos casan  →  consultas en página 1
```

---

## 5. Estado actual del POS

| | Al empezar | Ahora |
|---|---|---|
| Payload al abrir (catálogo) | 4.64 MB | **1.11 MB** (−76 %) |
| Payload al abrir (tarifas) | 240 KB | **122 KB** (−49 %) |
| Bitmaps decodificados en RAM | ~113 MB | ~3 MB |
| Peticiones de imagen al abrir | ~1 774 | solo las visibles |
| Tarjetas montadas | 1 777 | 48 |
| Nodos de DOM | ~30 000 | ~800 |
| Spinners animando | 1 774 | 0 |
| Coste por pulsación | 2.0 ms + 0.8 MB de basura | 0.4 ms + ~0 |
| Orden | fijo (fecha desc) | 4 campos × 2 sentidos, + consultas |

### Lo que se revisó y **no** era problema

- **No hay fugas de memoria.** Los dos únicos listeners del repo
  ([`sidebar.tsx:108`](../src/components/ui/sidebar.tsx#L108),
  [`use-mobile.ts:13`](../src/hooks/use-mobile.ts#L13)) devuelven su
  `removeEventListener`. No hay `setInterval` en ningún lado.
- **No hay estado que crezca sin techo.** El único array con append es `carts`
  ([useMultiCart.ts:113](../src/hooks/useMultiCart.ts#L113)), acotado por `MAX_CARTS`. Un
  turno de 8 horas no acumula nada.
- **`useEfectivoCaja` parece alarmante** (dos consultas con `pageSize=5000` montadas en el
  POS) **pero está bien hecho**: filtra por `fecha >= hoy` y farmacia, pide `fields`
  explícitos y se queda con 7 números.

---

## 6. Lo que podría mejorar

Por orden de impacto estimado:

1. **Caché compartido del catálogo.** Hoy navegar a `/admin/ventas`, `/admin/dashboard` o
   `/admin/reconciliacion` vuelve a bajar y reconstruir 1.11 MB cada vez. No es fuga (se
   libera al desmontar), pero se paga el pico en cada navegación. Un contexto, SWR o React
   Query lo evitaría.

2. **Los otros consumidores de `useGetProducts`.** `/admin/ventas` carga el catálogo
   entero solo para que el diálogo de devolución pueda restaurar stock: se podría pedir
   por venta, igual que se hizo con la compra. `/admin/dashboard` y
   `/admin/reconciliacion` son agregados sobre todo el catálogo por naturaleza; el
   dashboard quizá se resuelva con conteos del backend.

3. **Los 310 productos sin `stock_central`.** Escribir `0` en ellos desbloquearía el orden
   por stock completo en admin (hoy los excluye) y quitaría un riesgo latente de `NaN` en
   la aritmética de stock. Son 310 escrituras a producción; hay respaldo de la lista.

4. **El producto con stock negativo.** `Firac Plus 125 mg/10 mg` está en `-1`: se vendió
   más de lo registrado. Se ve de inmediato con "Stock · menor a mayor".

5. **Seis productos con el nombre capturado con un espacio delante.** El comparador de
   orden ya los recorta, pero el dato sigue sucio y afecta a cualquier otro consumo.

6. **Virtualización del grid** (`@tanstack/react-virtual`), si el catálogo crece mucho.
   Hoy no hace falta: con 48 tarjetas el DOM es trivial.

7. **La insignia de `service-card.tsx`** dice `type === "consultation" ? "Consulta" :
   "Procedimiento"`. Con el filtro del servidor la segunda rama es inalcanzable y toda
   tarjeta muestra "Consulta". Queda lista por si se reactivan los procedimientos, pero
   hoy es una condición que no decide nada.

8. **No hay tests.** Todo lo verificado en este trabajo se comprobó a mano contra el
   backend real o con scripts desechables. Las comparaciones "vieja vs nueva
   implementación" del buscador son un buen candidato a test de regresión.

---

## 7. Qué quedó sin verificar

Nada de esto se ejecutó en el navegador: el trabajo se validó con `tsc`, `next build`,
consultas reales al backend y comparación de implementaciones, pero no hubo sesión
iniciada en la app.

- ✅ **Selección de lote** — probada y funcionando tras el recorte del payload.
- ✅ **Los menús de orden** — probados en uso. De ahí salió el fallo de que el orden de
  consultas no restringía la vista, ya corregido.
- ⬜ Los tres modos excluyentes tras la corrección, en particular la secuencia que rompía:
  "Solo consultas" → una categoría → "Todos".
- ⬜ El carrusel de categorías y el paginador del grid en pantalla.

---

## 8. Archivos

**Nuevos**

| Archivo | Qué es |
|---|---|
| [`api/getProductsPage.ts`](../src/api/getProductsPage.ts) | Página del catálogo filtrada en Strapi (tabla de admin) |
| [`api/searchProducts.ts`](../src/api/searchProducts.ts) | Autocompletado contra el backend (facturas y compras) |
| [`lib/search.ts`](../src/lib/search.ts) | `normalize()` compartido |
| [`lib/grid-sort.ts`](../src/lib/grid-sort.ts) | Comparadores y opciones de orden del POS |
| [`components/sort-menu.tsx`](../src/components/sort-menu.tsx) | Menú de orden reutilizable |
| [`components/ui/dropdown-menu.tsx`](../src/components/ui/dropdown-menu.tsx) | Componente shadcn que faltaba |

**Modificados**

`api/getProducts.ts` · `api/getCategories.ts` · `app/page.tsx` ·
`app/admin/productos/page.tsx` · `app/admin/facturas/page.tsx` ·
`app/admin/compras/page.tsx` · `components/product-grid.tsx` ·
`components/product-card.tsx` · `components/product-sidebar.tsx` ·
`components/admin/products-table.tsx` · `components/admin/invoice-form.tsx` ·
`components/admin/new-purchase-dialog.tsx` ·
`components/admin/purchase/items-step.tsx` · `components/admin/purchase/types.ts` ·
`types/product.ts`
