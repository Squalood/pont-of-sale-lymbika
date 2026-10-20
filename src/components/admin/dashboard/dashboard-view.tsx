"use client";

import { useMemo, useState } from "react";
import { type DateRange } from "react-day-picker";
import { ComprasSection } from "@/components/admin/dashboard/compras-section";
import { DashboardFilters } from "@/components/admin/dashboard/dashboard-filters";
import { VentasSection } from "@/components/admin/dashboard/ventas-section";
import {
  aggregateDashboard,
  deriveOperadores,
  derivePharmacias,
  TODAS,
  TODOS,
} from "@/lib/dashboard-aggregate";
import {
  exportComprasCSV,
  exportComprasPorProductoCSV,
  exportVentasCSV,
  exportVentasPorProductoCSV,
  type CsvNaming,
} from "@/lib/dashboard-csv";
import { useMembershipName } from "@/api/getSiteConfig";
import { csvStamp } from "@/lib/csv";
import { resolveRange, type Period } from "@/lib/date-range";
import { fmtInt } from "@/lib/format";
import { CompraType } from "@/types/compra";
import { ProductType } from "@/types/product";
import { VentaType } from "@/types/venta";

/** Coincide con el `pageSize` de `useGetVentas` / `useGetCompras`. */
const FETCH_LIMIT = 5000;

interface DashboardViewProps {
  ventas: VentaType[];
  compras: CompraType[];
  comprasError?: string | null;
  products: ProductType[];
  loadingProducts?: boolean;
}

/**
 * Dueño del estado de los filtros. Todo el cálculo vive en `dashboard-aggregate` y el
 * armado de los CSV en `dashboard-csv`, así que aquí solo queda estado y composición.
 */
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
  const [operador, setOperador] = useState(TODOS);
  const membershipName = useMembershipName();

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

  const pharmacias = useMemo(() => derivePharmacias(ventas), [ventas]);
  const operadores = useMemo(() => deriveOperadores(ventas, compras), [ventas, compras]);
  const range = useMemo(() => resolveRange(period, dateRange), [period, dateRange]);

  const data = useMemo(
    () => aggregateDashboard(ventas, compras, { range, pharmacyId, operador }),
    [ventas, compras, range, pharmacyId, operador]
  );

  // Solo lo consume el CSV detallado, para el costo y el IVA por línea.
  const productsById = useMemo(() => {
    const map = new Map<number, ProductType>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const sucursal = pharmacias.find((p) => p.documentId === pharmacyId)?.nombre;
  const naming: CsvNaming = {
    stamp: csvStamp(range.from, range.to),
    sucursal,
    operador: operador !== TODOS ? operador : undefined,
  };

  return (
    <div className="space-y-6">
      <DashboardFilters
        period={period}
        dateRange={dateRange}
        onPeriodChange={handlePeriod}
        onDateRangeChange={handleDateRange}
        onClearDateRange={clearDateRange}
        pharmacias={pharmacias}
        pharmacyId={pharmacyId}
        onPharmacyChange={setPharmacyId}
        operadores={operadores}
        operador={operador}
        onOperadorChange={setOperador}
      />

      {ventas.length >= FETCH_LIMIT && (
        <p className="text-xs text-amber-600">
          Mostrando las {fmtInt(FETCH_LIMIT)} ventas más recientes; los períodos largos
          pueden quedar incompletos.
        </p>
      )}

      <VentasSection
        data={data}
        onExport={() => exportVentasCSV(data.ventasFiltradas, naming, membershipName)}
        onExportPorProducto={() =>
          exportVentasPorProductoCSV(data.ventasFiltradas, productsById, naming, membershipName)
        }
        porProductoDisabled={loadingProducts}
      />

      <ComprasSection
        data={data}
        comprasError={comprasError}
        sucursal={sucursal}
        onExport={() => exportComprasCSV(data.comprasRango, naming)}
        onExportPorProducto={() =>
          exportComprasPorProductoCSV(data.comprasRango, naming)
        }
      />
    </div>
  );
}
