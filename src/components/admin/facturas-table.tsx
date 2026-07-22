"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FacturaType } from "@/types/factura";
import { FacturaDetailDialog } from "@/components/admin/factura-detail-dialog";

type Period = "hoy" | "semana" | "mes" | "todo";
type EstadoPagoFilter = "todos" | "pendiente" | "pagada" | "pagada_parcial";
type EstadoPago = "pendiente" | "pagada" | "pagada_parcial";

interface FacturasTableProps {
  facturas: FacturaType[];
}

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isInPeriod(iso: string, period: Period): boolean {
  const d = new Date(iso);
  const now = new Date();
  if (period === "todo") return true;
  if (period === "hoy") return d.toDateString() === now.toDateString();
  if (period === "semana") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  pagada_parcial: "Pago parcial",
};

function EstadoPagoBadge({ ep }: { ep: EstadoPago | null | undefined }) {
  const estado: EstadoPago = ep ?? "pendiente";
  if (estado === "pagada") {
    return <Badge className="bg-emerald-600 text-white border-emerald-600">{ESTADO_PAGO_LABEL[estado]}</Badge>;
  }
  if (estado === "pagada_parcial") {
    return <Badge variant="outline" className="border-blue-400 text-blue-700">{ESTADO_PAGO_LABEL[estado]}</Badge>;
  }
  return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">{ESTADO_PAGO_LABEL[estado]}</Badge>;
}

export function FacturasTable({ facturas: initialFacturas }: FacturasTableProps) {
  const [facturas, setFacturas] = useState<FacturaType[]>(initialFacturas);
  const [period, setPeriod] = useState<Period>("todo");
  const [estadoPagoFilter, setEstadoPagoFilter] = useState<EstadoPagoFilter>("todos");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FacturaType | null>(null);

  useMemo(() => { setFacturas(initialFacturas); }, [initialFacturas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return facturas.filter((f) => {
      if (!isInPeriod(f.fecha, period)) return false;
      if (estadoPagoFilter !== "todos" && (f.estadoPago ?? "pendiente") !== estadoPagoFilter) return false;
      if (!q) return true;
      return (
        f.folio?.toLowerCase().includes(q) ||
        f.cliente?.toLowerCase().includes(q) ||
        (f.rfc ?? "").toLowerCase().includes(q)
      );
    });
  }, [facturas, period, estadoPagoFilter, search]);

  const totales = useMemo(
    () => filtered.reduce((s, f) => s + (f.total ?? 0), 0),
    [filtered]
  );

  function handleUpdated(documentId: string, patch: Partial<FacturaType>) {
    setFacturas((prev) =>
      prev.map((f) => (f.documentId === documentId ? { ...f, ...patch } : f))
    );
    setSelected((prev) => (prev?.documentId === documentId ? { ...prev, ...patch } : prev));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filtros período */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="hoy">Hoy</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mes</TabsTrigger>
            <TabsTrigger value="todo">Todo</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Buscar por folio, cliente o RFC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} factura{filtered.length !== 1 ? "s" : ""} · Total: ${fmt(totales)}
        </span>
      </div>

      {/* Filtro estado de pago */}
      <Tabs value={estadoPagoFilter} onValueChange={(v) => setEstadoPagoFilter(v as EstadoPagoFilter)}>
        <TabsList className="h-8">
          <TabsTrigger value="todos" className="text-xs px-3 h-7">Todos</TabsTrigger>
          <TabsTrigger value="pendiente" className="text-xs px-3 h-7">Pendientes</TabsTrigger>
          <TabsTrigger value="pagada" className="text-xs px-3 h-7">Pagadas</TabsTrigger>
          <TabsTrigger value="pagada_parcial" className="text-xs px-3 h-7">Pago parcial</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Uso CFDI</TableHead>
              <TableHead>Forma de pago</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado factura</TableHead>
              <TableHead>Estado pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  Sin facturas en este período
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => (
                <TableRow
                  key={f.documentId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(f)}
                >
                  <TableCell className="font-mono text-xs">{f.folio || "—"}</TableCell>
                  <TableCell className="text-sm">{fmtDate(f.fecha)}</TableCell>
                  <TableCell className="font-medium">{f.cliente}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.rfc || "—"}</TableCell>
                  <TableCell className="text-xs">{f.usoCfdi || "—"}</TableCell>
                  <TableCell className="text-sm">{f.formaDePago || "—"}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    ${fmt(f.total ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.estado === "cancelada" ? "destructive" : "default"}>
                      {f.estado ?? "emitida"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <EstadoPagoBadge ep={f.estadoPago} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FacturaDetailDialog
        factura={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onUpdated={(patch) => selected && handleUpdated(selected.documentId, patch)}
      />
    </div>
  );
}
