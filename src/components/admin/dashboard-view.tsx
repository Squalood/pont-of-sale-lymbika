"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Download,
  DollarSign,
  Package,
  Receipt,
  Scale,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/admin/kpi-card";
import { PeriodFilter } from "@/components/admin/period-filter";
import {
  MetodosPagoChart,
  TopProductosChart,
  VentasTrendChart,
  VentasVsComprasChart,
} from "@/components/admin/dashboard-charts";
import { csvStamp, downloadCSV } from "@/lib/csv";
import { inRange, type Period, resolveRange, rangeSpanDays } from "@/lib/date-range";
import { fmtInt, fmtMoney } from "@/lib/format";
import { ventaCardCharged, ventaCardSurcharge } from "@/lib/checkout-math";
import {
  buildTrend,
  contarArticulos,
  pickBucket,
  sumPagos,
  topProductos,
} from "@/lib/ventas-aggregate";
import { productImpuesto, SERVICE_IMPUESTO, taxRate } from "@/lib/pricing";
import { CompraType } from "@/types/compra";
import { ProductType } from "@/types/product";
import { VentaType } from "@/types/venta";

const TODAS = "todas";
const TODOS = "todos";

/** Coincide con el `pageSize` de `useGetVentas` / `useGetCompras`. */
const FETCH_LIMIT = 5000;

interface DashboardViewProps {
  ventas: VentaType[];
  compras: CompraType[];
  comprasError?: string | null;
  products: ProductType[];
  loadingProducts?: boolean;
}

export function DashboardView({
  ventas,
  compras,
  comprasError,
  products,
  loadingProducts,
}: DashboardViewProps) {
  const [period, setPeriod] = useState<Period>("semana");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [pharmacyId, setPharmacyId] = useState(TODAS);
  const [operadorFilter, setOperadorFilter] = useState(TODOS);

  function handlePeriod(p: Period) {
    setPeriod(p);
    setDateRange(undefined);
  }

  function handleDateRange(range: DateRange | undefined) {
    setDateRange(range);
    if (range?.from) setPeriod("custom");
  }

  function clearDateRange() {
    setDateRange(undefined);
    setPeriod("semana");
  }

  const pharmacias = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of ventas) {
      const p = v.pharmacies?.[0];
      if (p?.documentId) map.set(p.documentId, p.nombre);
    }
    return Array.from(map.entries()).map(([documentId, nombre]) => ({ documentId, nombre }));
  }, [ventas]);

  const operadores = useMemo(() => {
    const unique = new Set<string>();
    for (const v of ventas) if (v.operador) unique.add(v.operador);
    for (const c of compras) if (c.operador) unique.add(c.operador);
    return Array.from(unique).sort();
  }, [ventas, compras]);

  const range = useMemo(() => resolveRange(period, dateRange), [period, dateRange]);

  const productsById = useMemo(() => {
    const map = new Map<number, ProductType>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const data = useMemo(() => {
    // Los hooks no filtran cancelados: hay que excluirlos explícitamente.
    const ventasFiltradas = ventas.filter(
      (v) =>
        v.estado === "completada" &&
        inRange(v.fecha, range) &&
        (pharmacyId === TODAS || v.pharmacies?.[0]?.documentId === pharmacyId) &&
        (operadorFilter === TODOS || v.operador === operadorFilter)
    );

    // Las compras no tienen relación con farmacia: se registran a nivel central,
    // así que el selector de sucursal no puede acotarlas. El operador sí existe en
    // ambas colecciones, así que ese filtro aplica igual aquí.
    const comprasRango = compras.filter(
      (c) =>
        c.estado === "registrada" &&
        inRange(c.fecha, range) &&
        (operadorFilter === TODOS || c.operador === operadorFilter)
    );
    // Las compras previas a la captura de costos traen `total: 0` y hundirían
    // cualquier promedio, así que quedan fuera del dinero pero se reportan.
    const comprasCosto = comprasRango.filter((c) => c.total > 0);
    const sinCosto = comprasRango.length - comprasCosto.length;

    const pagos = sumPagos(ventasFiltradas);
    const ingresos = pagos.totalImporte;
    const egresos = comprasCosto.reduce((sum, c) => sum + c.total, 0);

    const fechas = [...ventasFiltradas, ...comprasRango].map((r) => new Date(r.fecha));
    const masAntigua = fechas.length
      ? new Date(Math.min(...fechas.map((d) => d.getTime())))
      : new Date();
    const bucket = pickBucket(rangeSpanDays(range, masAntigua));

    return {
      ventasFiltradas,
      comprasRango,
      comprasCosto,
      sinCosto,
      pagos,
      ingresos,
      egresos,
      ticketPromedio: pagos.numVentas > 0 ? ingresos / pagos.numVentas : 0,
      costoPromedio: comprasCosto.length > 0 ? egresos / comprasCosto.length : 0,
      articulos: contarArticulos(ventasFiltradas),
      unidadesCompradas: comprasRango.reduce(
        (sum, c) => sum + (c.items ?? []).reduce((s, i) => s + i.quantity, 0),
        0
      ),
      top: topProductos(ventasFiltradas, 10),
      trend: buildTrend(range, bucket, ventasFiltradas, comprasCosto),
    };
  }, [ventas, compras, range, pharmacyId, operadorFilter]);

  const sucursal = pharmacias.find((p) => p.documentId === pharmacyId)?.nombre;
  const operadorSuffix = operadorFilter !== TODOS ? `_${slug(operadorFilter)}` : "";
  const stamp = csvStamp(range.from, range.to);

  function exportVentas() {
    downloadCSV(
      `ventas_${stamp}${sucursal ? `_${slug(sucursal)}` : ""}${operadorSuffix}.csv`,
      [
        "Fecha",
        "Folio",
        "Farmacia",
        "Operador",
        "Método de pago",
        "Subtotal",
        "IVA",
        "Total",
        "Efectivo MXN",
        "Efectivo USD",
        "Tipo de cambio",
        "Tarjeta cobrada",
        "Recargo tarjeta",
        "Transferencia",
        "Membresía",
        "Artículos",
        "Nota",
      ],
      data.ventasFiltradas.map((v) => {
        const usd = v.recibidoUSD ?? 0;
        const tc = v.tipoCambioUsado ?? 1;
        // Mismas ramas que `accumulatePago`, para que las sumas del CSV cuadren
        // con la gráfica de métodos de pago.
        const efectivoMXN =
          v.metodoPago === "efectivo" || v.metodoPago === "mixto"
            ? (v.recibido ?? 0) - usd * tc - (v.cambio ?? 0)
            : 0;
        const transferencia =
          v.metodoPago === "mixto"
            ? (v.montoTransferencia ?? 0)
            : v.metodoPago === "transfe"
              ? v.total
              : 0;
        const tarjeta =
          v.metodoPago === "tarjeta" || v.metodoPago === "mixto" ? ventaCardCharged(v) : 0;

        return [
          new Date(v.fecha).toLocaleString("es-MX"),
          String(v.id).padStart(5, "0"),
          v.pharmacies?.[0]?.nombre ?? "",
          v.operador,
          v.metodoPago,
          v.subtotal.toFixed(2),
          v.iva.toFixed(2),
          v.total.toFixed(2),
          efectivoMXN.toFixed(2),
          usd.toFixed(2),
          tc.toFixed(2),
          tarjeta.toFixed(2),
          ventaCardSurcharge(v).toFixed(2),
          transferencia.toFixed(2),
          v.esMembresia ? "Sí" : "No",
          (v.venta ?? []).reduce((s, i) => s + i.quantity, 0),
          v.nota ?? "",
        ];
      })
    );
  }

  function exportVentasDetalle() {
    downloadCSV(
      `ventas-detalle_${stamp}${sucursal ? `_${slug(sucursal)}` : ""}${operadorSuffix}.csv`,
      [
        "Fecha",
        "Folio",
        "Producto",
        "Cantidad",
        "Costo proveedor (unitario)",
        "Costo proveedor (total)",
        "Precio pagado (unitario)",
        "Precio pagado (total)",
        "IVA cobrado",
      ],
      // Una fila por línea de producto/servicio, a diferencia de `ventas.csv` que es
      // una fila por venta.
      //
      // Dos columnas son aproximadas y no un dato histórico exacto, porque el backend
      // no los persiste por línea (confirmado en el commit que metió el IVA editable
      // por artículo: "el impuesto por línea no se persiste"):
      //  - Costo proveedor: el `priceMember` ACTUAL del producto en el catálogo. Es el
      //    mismo campo que se sobrescribe con el costo real cada vez que se registra una
      //    compra (ver new-purchase-dialog.tsx), así que es el mejor costo disponible,
      //    pero una venta vieja puede haber costado distinto si hubo compras después.
      //  - IVA cobrado: se recalcula con la tasa ACTUAL del producto (`impuesto`), no la
      //    que estaba vigente el día de la venta. El cajero también puede corregir la
      //    tasa por línea desde el chip de IVA en el cobro, y esa corrección no se guarda,
      //    así que esta columna puede no coincidir centavo a centavo con el ticket
      //    original si hubo una corrección manual.
      // "Precio pagado" sí es exacto: es el `unitPrice` que quedó grabado en la venta.
      data.ventasFiltradas.flatMap((v) =>
        (v.venta ?? []).map((item) => {
          const product = item.product ? productsById.get(item.product.id) : undefined;
          const costoUnitario = product?.priceMember ?? null;

          const rate =
            item.type === "service"
              ? taxRate(SERVICE_IMPUESTO)
              : product
                ? taxRate(productImpuesto(product))
                : 0;
          // unitPrice ya incluye el IVA (es lo que se cobró), así que se despeja hacia
          // atrás: iva = total − total / (1 + tasa).
          const ivaLinea = rate > 0 ? item.totalLine - item.totalLine / (1 + rate) : 0;

          return [
            new Date(v.fecha).toLocaleString("es-MX"),
            String(v.id).padStart(5, "0"),
            item.productName,
            item.quantity,
            costoUnitario != null ? costoUnitario.toFixed(2) : "",
            costoUnitario != null ? (costoUnitario * item.quantity).toFixed(2) : "",
            item.unitPrice.toFixed(2),
            item.totalLine.toFixed(2),
            ivaLinea.toFixed(2),
          ];
        })
      )
    );
  }

  function exportCompras() {
    downloadCSV(
      `compras_${stamp}${sucursal ? "_todas-las-farmacias" : ""}${operadorSuffix}.csv`,
      [
        "Fecha",
        "Folio",
        "Proveedor",
        "Operador",
        "Total",
        "Productos",
        "Unidades",
        "Costos registrados",
        "Factura adjunta",
        "Notas",
      ],
      // Se incluyen las de total 0 con la columna "Costos registrados" para que la
      // suma del CSV se pueda reconciliar contra el KPI de egresos.
      data.comprasRango.map((c) => {
        const items = c.items ?? [];
        return [
          new Date(c.fecha).toLocaleString("es-MX"),
          String(c.id).padStart(5, "0"),
          c.proveedor?.name ?? "",
          c.operador ?? "",
          c.total.toFixed(2),
          new Set(items.map((i) => i.product?.documentId ?? i.productName)).size,
          items.reduce((s, i) => s + i.quantity, 0),
          c.total > 0 ? "Sí" : "No",
          c.archivo?.name ?? "",
          c.notas ?? "",
        ];
      })
    );
  }

  const balance = data.ingresos - data.egresos;

  return (
    <div className="space-y-6">
      <PeriodFilter
        period={period}
        dateRange={dateRange}
        onPeriodChange={handlePeriod}
        onDateRangeChange={handleDateRange}
        onClear={clearDateRange}
      >
        {pharmacias.length > 1 && (
          <Select value={pharmacyId} onValueChange={setPharmacyId}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>all Sucursales</SelectItem>
              {pharmacias.map((p) => (
                <SelectItem key={p.documentId} value={p.documentId}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {operadores.length > 1 && (
          <Select value={operadorFilter} onValueChange={setOperadorFilter}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>all Operadores</SelectItem>
              {operadores.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </PeriodFilter>

      {ventas.length >= FETCH_LIMIT && (
        <p className="text-xs text-amber-600">
          Mostrando las {fmtInt(FETCH_LIMIT)} ventas más recientes; los períodos largos
          pueden quedar incompletos.
        </p>
      )}

      {/* ── Ventas ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Ventas</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportVentas}
              disabled={data.ventasFiltradas.length === 0}
            >
              <Download className="mr-1.5 h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportVentasDetalle}
              disabled={data.ventasFiltradas.length === 0 || loadingProducts}
            >
              <Download className="mr-1.5 h-4 w-4" />
              CSV detalle
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Ingresos" value={fmtMoney(data.ingresos)} icon={DollarSign} tone="green" />
          <KpiCard label="Ventas" value={fmtInt(data.pagos.numVentas)} icon={ShoppingBag} tone="blue" />
          <KpiCard
            label="Ticket promedio"
            value={fmtMoney(data.ticketPromedio)}
            icon={Receipt}
            tone="purple"
          />
          <KpiCard
            label="Artículos vendidos"
            value={fmtInt(data.articulos)}
            icon={Package}
            tone="amber"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <VentasTrendChart
            data={data.trend}
            total={data.ingresos}
            className="min-w-0 lg:col-span-2"
          />
          <MetodosPagoChart pagos={data.pagos} className="min-w-0" />
        </div>
      </section>

      {/* ── Compras ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Compras</h2>
            {sucursal && (
              <Badge variant="outline" className="font-normal">
                Todas las farmacias
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCompras}
            disabled={data.comprasRango.length === 0}
          >
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
        </div>

        {sucursal && (
          <p className="text-xs text-muted-foreground">
            Las compras se registran a nivel central y no se filtran por sucursal.
          </p>
        )}

        {comprasError ? (
          <p className="text-sm text-destructive">{comprasError}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Egresos"
              value={fmtMoney(data.egresos)}
              icon={TrendingDown}
              tone="rose"
              hint={data.sinCosto > 0 ? `${data.sinCosto} sin costo registrado` : undefined}
            />
            <KpiCard
              label="Compras"
              value={fmtInt(data.comprasRango.length)}
              icon={ShoppingCart}
              tone="blue"
            />
            <KpiCard
              label="Unidades ingresadas"
              value={fmtInt(data.unidadesCompradas)}
              icon={Boxes}
              tone="amber"
            />
            <KpiCard
              label="Balance"
              value={fmtMoney(balance)}
              icon={Scale}
              tone={balance >= 0 ? "green" : "rose"}
              hint="Ingresos − egresos"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TopProductosChart productos={data.top} className="min-w-0" />
          <VentasVsComprasChart
            data={data.trend}
            excluidas={comprasError ? 0 : data.sinCosto}
            scopeNote={
              comprasError
                ? "Compras no disponibles."
                : sucursal
                  ? `Ventas de ${sucursal} · Compras de todas las farmacias.`
                  : undefined
            }
            className="min-w-0"
          />
        </div>
      </section>
    </div>
  );
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
