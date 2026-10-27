# Point of Sale Lymbika — contexto para Claude

Contexto general (máquina, backend local vs. producción, Neon, OneDrive): ver `..\..\CLAUDE.md`. Hablar en español.

## Qué es
POS web de las farmacias Lymbika (mostrador + panel admin). Repo GitHub `Squalood/pont-of-sale-lymbika` (sin "i"), rama `main`.
Next.js 16 (App Router, `src/`), React 19, TypeScript, Tailwind 4, shadcn/Radix (`src/components/ui`), Recharts, date-fns, sonner.
No tiene backend propio: todo va contra el Strapi 5 de `Lymbika-Backend` (ventas-pos, cajas-pos, compras, devoluciones, `pos-stock`, stock-transfer, inventory-lot, pharmacy-stock, site-config…).

## Comandos
- `npm run dev -- -p 3001` (el 3000 es del frontend de la tienda)
- `npm run build` · `npm run lint` · `npx tsc --noEmit`
- `npm run validar-margen -- ruta/ventas-por-producto_*.csv`: audita el retorno de un export (`scripts/validar-margen.mjs`).

## OJO: .env.local apunta a PRODUCCIÓN
`NEXT_PUBLIC_BACKEND_URL` va por defecto a `https://lymbika-backend.onrender.com`. **Cualquier venta, compra, devolución, traspaso o ajuste hecho desde el POS local se escribe en la base real** (stock incluido). Para probar sin riesgo: cambiar a la línea comentada de `http://localhost:1337`, levantar el backend y reiniciar `npm run dev`. No leer ni copiar valores del `.env.local`.
Variables: `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_WEBSHOP_URL` (link a la ficha en la tienda), `NEXT_PUBLIC_EXPORT_TOKEN` (export de productos), `NEXT_PUBLIC_ENABLE_MOVE_ALL` (`"true"` muestra "pasar toda la bodega a una farmacia").

## Mapa
- `src/app/page.tsx`: pantalla de venta (catálogo + hasta 4 carritos). `src/app/login`.
- `src/app/admin/*`: `dashboard` (KPIs, gráficas, CSV), `ventas`, `compras`, `devoluciones`, `cajas`, `facturas`, `productos`, `stock`, `traspasos`, `caducidades`. Menú en `components/admin/admin-sidebar.tsx`.
- `src/app/api/descargar/route.ts`: proxy de descarga de adjuntos de CloudFront (sin CORS); solo permite `*.cloudfront.net` (anti-SSRF).
- `src/api/`: un archivo por llamada (`getX` = hook de lectura, `postX`/`patchX`/`putX` = escritura). `src/api/posStock.ts` = cliente de `/api/pos-stock/*`.
- `src/lib/`: lógica pura (precios, impuestos, cobro, lotes, stock, CSV, impresión de tickets/facturas). `src/hooks/`: `useCheckout`, `useMultiCart`, `useCartTotals`, `usePharmacies`. `src/types/`: tipos por entidad.
- `docs/`: documentación interna de decisiones; **leer antes de tocar esas áreas**: `flujo-venta.md`, `stock-por-farmacia.md`, `caducidades-mermas.md`, `reportes-csv.md`, `optimizacion-catalogo.md`, `pendiente-costo-historico.md`.

## Cómo habla con Strapi
- Siempre con `authFetch` (`src/lib/auth.ts`): agrega `Bearer` con el JWT (`localStorage pos_jwt` + cookie `pos_jwt` de 8 h) y lanza `ForbiddenError` en 403.
- `src/proxy.ts` (middleware de Next 16) redirige a `/login` sin cookie. No hay roles en el front: los permisos los decide Strapi (Users & Permissions); un 403 muestra `components/unauthorized.tsx` vía `lib/forbidden-context.tsx`.
- Hooks de lectura con `useState/useEffect` (sin React Query/SWR). Pedir **campos explícitos** (`fields[]`, `populate[x][fields][]`), nunca `populate=*` (ver `api/getProducts.ts`). El admin pagina en servidor (`getProductsPage.ts`); autocompletados buscan en backend (`searchProducts.ts`).
- Enlaces al admin de Strapi: `src/lib/strapi-links.ts`.
- Errores/avisos al usuario con `toast` de sonner (`<Toaster position="bottom-right" richColors />` en `app/layout.tsx`), mensajes en español que digan qué pasó y qué no.

## Reglas de negocio (no romper)
- **Stock solo lo escribe el backend**, en transacción e idempotente (`/api/pos-stock/sale|return|purchase|transfer|...`). El POS manda el documentId o el delta y aplica los `levels` que devuelve (`lib/stock.ts`). Nunca escribir `stock_central` a mano. `stock_central` = total; stock por farmacia en `pharmacy-stock`; bodega = total − farmacias; lote con `pharmacy` vacío = bodega.
- Orden del cobro (`hooks/useCheckout.ts`): 1) `postVenta`; si falla, abortar sin tocar stock ni imprimir. 2) descuento vía `runOrQueue` (`lib/pending-stock.ts`): si falla queda en cola en localStorage (`pos_pending_stock`) y se reintenta. 3) imprimir ticket. Se permite stock negativo con aviso.
- La venta **congela** por línea `unitCost` (= `priceMember` al cobrar, `null` nunca 0) y `tax` (código `iva0|iva8|iva16|exento`), más snapshot del lote (`lotDocumentId`, `lotNumber`, `expirationDate`). Los reportes leen eso, no el catálogo.
- Precios del catálogo son **netos**; el IVA se suma al cobrar (`lib/pricing.ts`, `lib/tax.ts`). Servicios siempre `iva8`; `exento` solo para servicios. Precio tecleado a mano = precio final con IVA.
- Tarifas (`PriceMode`): `regular` (mostrador, `price`), `member` (membresía, `priceMember`), `proveedor` (`priceMember` × 1.10 de management fee **dentro** del precio de cada línea). El nombre de la membresía viene de `site-config.membershipName` (default "Health Pass", `api/getSiteConfig.ts`); no hardcodearlo.
- Pagos (`lib/checkout-math.ts`, `computeCharge` es la única fuente de verdad): efectivo MXN/USD (tipo de cambio), tarjeta, transferencia (`transfe`) o `mixto`. Recargo de tarjeta 3% solo con membresía. Se guarda total = subtotal + iva + recargoTarjeta, redondeado a centavos.
- Multi-farmacia: la farmacia de la computadora está en `localStorage pos_pharmacy_id`; la caja abierta (`lib/caja-context.tsx`) es por farmacia y la venta descuenta de su farmacia. Cajas de días anteriores se autocierran (`api/autoCloseCajas.ts`); efectivo y corte cuentan desde la apertura.
- Lotes: vendibles = `activo`, con existencia y no vencidos, orden FEFO; `2099-12-31` = lote de apertura sin caducidad real (`lib/lotes.ts`). Desechar un lote lo marca `vencido` (nunca se borra).
- Carritos persisten en `sessionStorage` (`pos:carts`), por pestaña.
- Ventas canceladas no salen en reportes.

## Convenciones
- Commits en español, Conventional Commits con scope opcional: `feat(admin): ...`, `fix(caja): ...`, `perf(catalogo): ...`, `refactor:`, `chore(api):`. El mensaje explica el porqué/efecto ("la venta congela el costo y la tasa al cobrar").
- Comentarios del código en español y explicando el porqué; no hay `as any` en el repo, mantenerlo.
- Cambios de content types: primero en el backend (admin local) → push → después el POS.
