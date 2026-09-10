# Caducidades y mermas de lotes

Guía interna · Punto de Venta Lymbika

Documento del flujo **actual** de la sección `/admin/caducidades`: cómo se localizan los
lotes caducos, qué pasa exactamente al desecharlos y qué puede salir mal.

Implementado el 10-sep-2026.

---

## 1. Resumen en una línea

Desechar un lote lo marca con `state: "vencido"` y `currentAmount: 0`, guarda cuántas
unidades se dieron de baja en `discardedQuantity`, y descuenta esa misma cantidad del
`stock_central` del producto. **El lote nunca se borra**: la pestaña de Mermas es
literalmente la lista de lotes en estado `vencido`.

---

## 2. Por qué marcar y no borrar

Borrar el lote destruiría el registro de la merma, que es justamente lo que se quería
tener. Además dejaría huérfano el `lotDocumentId` que **cada venta ya guarda como snapshot
por línea** ([venta.ts](../src/types/venta.ts)): un ticket viejo apuntaría a un lote
inexistente.

El enum `state` de Strapi ya contemplaba `"vencido"` desde antes, pero ningún proceso lo
escribía: `postLote` solo escribe `"activo"` y `patchLote` solo `"agotado"`. Esta pantalla
es la primera que usa ese valor.

La consecuencia útil es que **no hubo que tocar la venta**: `getSellableLots`
([lotes.ts](../src/lib/lotes.ts)) ya filtraba por `state === "activo"`, así que un lote
marcado desaparece del picker del POS solo.

---

## 3. Qué se agregó

**Backend (Strapi, repo aparte).** Cuatro campos en el content-type `inventory-lot`:

| Campo | Tipo |
|---|---|
| `discardedAt` | `datetime` |
| `discardedBy` | `string` |
| `discardedQuantity` | `integer` |
| `discardReason` | `enumeration`: `expired` / `damaged` / `theft` / `other` |

El enum va **en inglés**, como el resto de los campos del content-type; la etiqueta en
español vive solo en la UI (`DISCARD_REASON_LABELS`). El único enum en español es `state`,
que ya existía.

Permisos: el rol **operador** necesita `find` y `update` sobre `inventory-lot`. `find`
sobre la colección es nuevo — antes los lotes solo se leían por `populate` desde
`/api/products`.

**Frontend.**

| Archivo | Qué hace |
|---|---|
| [types/lote.ts](../src/types/lote.ts) | `LoteType` (era código muerto, se reescribió) + `DiscardReason` y sus etiquetas |
| [api/getLotes.ts](../src/api/getLotes.ts) | `useGetLotes()` — trae los lotes `activo` y `vencido` con el producto poblado |
| [api/patchLote.ts](../src/api/patchLote.ts) | Extendido con los cuatro campos; `currentAmount` pasó a opcional |
| [lib/lotes.ts](../src/lib/lotes.ts) | `isExpiringSoon`, `daysUntil`, `addDaysISO`, `hasRealExpiration`, `EXPIRING_SOON_DAYS` |
| [lib/discard-lotes.ts](../src/lib/discard-lotes.ts) | `stockEffects` y `discardLotes` — **aquí vive toda la regla de escritura** |
| [components/admin/caducidades-table.tsx](../src/components/admin/caducidades-table.tsx) | Las tres pestañas, selección múltiple, CSV |
| [components/admin/discard-lote-dialog.tsx](../src/components/admin/discard-lote-dialog.tsx) | Confirmación con el efecto en stock |
| [app/admin/caducidades/page.tsx](../src/app/admin/caducidades/page.tsx) | La página |
| [components/admin/admin-sidebar.tsx](../src/components/admin/admin-sidebar.tsx) | El link del menú |

---

## 4. Las tres pestañas

Todas parten del mismo fetch: `state` en (`activo`, `vencido`), `pageSize=5000`. Los
`agotado` no se piden — ya se vendieron y son ruido.

| Pestaña | Filtro | Acción |
|---|---|---|
| **Vencidos** | `activo`, `currentAmount > 0`, caducidad anterior a hoy | Desechar, individual o masivo |
| **Por vencer** | `activo`, `currentAmount > 0`, caduca dentro de 30 días | Solo aviso |
| **Mermas** | `vencido`, ordenado por `discardedAt` descendente | Solo lectura |

Dos exclusiones deliberadas:

- **Lotes con existencia 0** no aparecen aunque estén vencidos: no hay merma que registrar,
  se vendieron completos y solo les faltó el `state: "agotado"`. Al momento de implementar
  había 13 así.
- **La centinela `2099-12-31`** (lotes de apertura) y los lotes con `expirationDate: null`
  nunca caen en Vencidos ni en Por vencer, porque los filtros son por fecha y esa fecha
  jamás entra en la ventana.

La ventana de 30 días es la constante `EXPIRING_SOON_DAYS` en
[lib/lotes.ts](../src/lib/lotes.ts). Cambiarla ahí cambia la pestaña y el texto de la
página.

---

## 5. Qué escribe exactamente "desechar"

Por cada lote:

```ts
patchLote(documentId, {
  currentAmount: 0,
  state: "vencido",
  discardedAt: new Date().toISOString(),
  discardedBy: getUser()?.username ?? "desconocido",
  discardedQuantity: <el currentAmount que tenía>,
  discardReason: <el motivo elegido>,
})
```

Y después, **agregado por producto**:

```ts
patchProductStock(productDocumentId, Math.max(0, stock_central - Σ desechado))
```

### Dos reglas que no se pueden romper

**1. Un solo `patchProductStock` por producto**, con la suma de todos sus lotes.
`patchProductStock` escribe un valor **absoluto**, no un delta. Si se patcheara dentro del
loop de lotes, el último sobrescribiría a los anteriores y de dos lotes de 10 y 7 solo se
descontarían 7. Es el mismo agrupado que ya hacen `useCheckout` y el diálogo de compras.

**2. `patchLote` primero, `patchProductStock` después**, restando solo lo de los lotes que
sí se marcaron. Si falla el lote, el stock no baja y la reconciliación detecta el
desajuste; al revés el lote seguiría vendible y se despacharía mercancía caducada.

Ambas viven aisladas en [lib/discard-lotes.ts](../src/lib/discard-lotes.ts) precisamente
para que un cambio en el componente no las pueda romper.

---

## 6. Por qué no descuadra la reconciliación

`sumActiveLots` en [reconciliacion-tool.tsx](../src/components/admin/reconciliacion-tool.tsx)
solo cuenta lotes en `activo`. Al desechar un lote de Q unidades:

```
antes:    diff = stock_central − Σ activos
después:  diff = (stock_central − Q) − (Σ activos − Q) = stock_central − Σ activos
```

El `diff` **no se mueve**. Por eso la pantalla de reconciliación no necesitó cambios, y por
eso es una buena verificación: si después de desechar el `diff` de ese producto cambió,
algo salió mal.

---

## 7. Elementos a tomar en cuenta

- **Los 9 lotes históricos.** Ya había lotes marcados `vencido` a mano en Strapi antes de
  esta pantalla. Aparecen en Mermas sin cantidad, motivo ni usuario; la columna muestra
  `—` en vez de `0` porque el dato es *desconocido*, no cero. Todos tenían `stock_central`
  en 0, o sea que ya estaban ajustados: no hay nada pendiente con ellos.
- **No hay merma parcial.** Se desecha el lote completo. Si se rompieron 3 de 10, hoy no se
  puede registrar; los campos ya desplegados lo soportarían sin migración.
- **Un lote sin producto asociado no se puede desechar** — se omite y el diálogo lo avisa.
  No hay stock que ajustar.
- **El motivo aplica a toda la selección** en el desecho masivo.
- **No se registra nota libre.** Si el motivo es "Otro", no hay dónde explicar qué pasó
  (decisión explícita al definir el alcance).
- **El lote sigue existiendo** después de desecharse, así que los tickets viejos que lo
  referencian siguen resolviendo.

---

## 8. Posibles fallas

Ordenadas por probabilidad de morder.

### 8.1 Stock desactualizado por concurrencia — el riesgo real

`patchProductStock` escribe un **valor absoluto** calculado sobre el `stock_central` que
venía en el fetch de la pantalla. Si alguien vende ese producto en el POS mientras la
pantalla lleva rato abierta, el patch **pisa la venta**: el stock vuelve a un valor
calculado desde una foto vieja.

No es un defecto de esta pantalla, es cómo funciona el stock en todo el sistema (ventas,
compras y devoluciones tienen el mismo patrón). Pero aquí la ventana es más ancha porque
la pantalla puede quedarse abierta.

**Mitigación:** usar el botón *Recargar* antes de desechar, sobre todo si la pantalla lleva
tiempo abierta o hay caja operando. Desechar en horario de poco movimiento.

### 8.2 Escrituras sin transacción

`patchLote` y `patchProductStock` son dos llamadas separadas. Si la primera pasa y la
segunda falla, el lote queda marcado pero el stock no baja. El código lo detecta y avisa
con un toast remitiendo a reconciliación, y **solo descuenta lo de los lotes que sí se
marcaron**, pero la corrección es manual.

Se eligió ese orden a propósito: es el sentido de fallo seguro. Un lote marcado sin stock
ajustado se ve en la reconciliación; un stock ajustado con el lote sin marcar dejaría
mercancía caducada a la venta.

### 8.3 Desincronización previa entre stock y lotes

Si el `stock_central` de un producto **no incluía** ese lote (por captura incompleta o por
las devoluciones del punto 8.5), restar baja el stock de más. `Math.max(0, …)` evita
valores negativos, pero no evita el descuadre.

**Mitigación:** el diálogo muestra el efecto exacto (`Producto: 40 → 23`) antes de
confirmar. Si el resultado no tiene sentido, cancelar y revisar en reconciliación.

### 8.4 `todayISO()` está en UTC

`todayISO()` usa `new Date().toISOString()`, que es UTC. En México (UTC−6) eso significa
que **a partir de las 18:00 hora local, "hoy" ya es el día siguiente**. Un lote que caduca
hoy se puede mostrar como vencido esas últimas seis horas del día.

Es preexistente —la venta usa el mismo helper— y de bajo impacto (un día de margen en
mercancía que de todos modos está por caducar), pero explica cualquier desfase de un día
que se observe.

### 8.5 Las devoluciones no revierten lotes

[return-dialog.tsx](../src/components/admin/return-dialog.tsx) solo hace
`patchProductStock(base + qty)`, mientras que la venta **sí** baja el `currentAmount` del
lote. Cada devolución de una línea loteada mete deriva permanente entre `stock_central` y
la suma de lotes.

Es un bug preexistente de la sección de devoluciones, fuera del alcance de esta
implementación, pero **degrada la confiabilidad de los números de esta pantalla**: mientras
exista, el `currentAmount` de los lotes puede quedarse corto frente al stock real.

### 8.6 Techo de 5 000 lotes

El hook pide `pagination[pageSize]=5000` y filtra en cliente, siguiendo el patrón del resto
del repo. Al implementar había **975 lotes** en `activo` + `vencido` (de 1 134 totales), así
que hay margen amplio. Pero si algún día se pasa de 5 000, la pantalla mostraría datos
incompletos **en silencio**, sin ningún aviso.

Como los lotes desechados nunca se borran, ese número **solo crece**. Vale la pena revisarlo
de vez en cuando: si `activo` + `vencido` se acerca a 4 000, hay que paginar o dejar de
traer los `vencido` completos.

### 8.7 Fallo de permisos

Si el rol pierde `find` sobre `inventory-lot`, la página muestra "Error al cargar lotes:
Error 403". `authFetch` lanza `ForbiddenError` en los 403, y **ninguna página de admin
captura ese error** de forma especial (solo el POS lo hace): se pinta como error genérico.

### 8.8 El enum en una escritura real — resuelto

Se verificó que los cuatro campos existen y llegan por REST, y el schema declara
`expired`/`damaged`/`theft`/`other`. Quedaba pendiente un `PUT` real con esos valores, que
requería escribir sobre un lote de producción: **se hizo un desecho individual desde la UI
y funcionó**, así que el enum se acepta en escritura.

Se deja anotado el modo de fallo por si el enum cambia en el futuro: si Strapi rechazara el
valor, el desecho fallaría con el toast de error y **nada quedaría a medias**, porque el
stock solo se toca después de que el lote se marca.

---

## 9. Estado de verificación

Hecho:

- `npx tsc --noEmit` y `npm run build` limpios, con la ruta `/admin/caducidades` generada.
- 21 comprobaciones sobre las funciones puras, incluida la regla del agregado (dos lotes de
  10 y 7 sobre stock 40 dan **23**, no 33), el tope en 0 y los bordes de fecha.
- Contra el backend desplegado: `GET` con JWT devuelve `200`, los cuatro campos llegan, y
  el filtro por `state` junto con el `populate` de `stock_central` responden lo esperado.
- **Un desecho individual desde la UI**, contra producción. Con esto queda confirmado que
  el enum `expired` se acepta en escritura (el pendiente del punto 8.8).

Pendiente de comprobar en uso real:

- **Un producto con dos o más lotes vencidos desechados juntos** — es el caso que detecta
  el bug de sobrescritura del punto 5.
- Que el `diff` de reconciliación de ese producto quede igual antes y después.

---

## 10. Nota sobre el lint

`npm run lint` está roto en el proyecto desde antes de esta implementación:
`package.json` declara `eslint-config-next: "^0.2.4"`, una versión que no corresponde al
paquete (las reales van en 15.x/16.x), y ESLint no resuelve el módulo. La verificación de
tipos se hizo con `npx tsc --noEmit` y `npm run build`, que sí corren.
