"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCSV } from "@/lib/csv";
import {
  EXPIRING_SOON_DAYS,
  daysUntil,
  hasRealExpiration,
  isExpired,
  isExpiringSoon,
  todayISO,
} from "@/lib/lotes";
import { DISCARD_REASON_LABELS } from "@/types/lote";
import type { LoteType } from "@/types/lote";
import { DiscardLoteDialog } from "@/components/admin/discard-lote-dialog";
import { loteLocationName, loteLocationStock } from "@/lib/discard-lotes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TODAS = "todas";
const locKey = (l: LoteType) => l.pharmacy?.documentId ?? "bodega";

type Tab = "vencidos" | "porvencer" | "mermas";

interface CaducidadesTableProps {
  lotes: LoteType[];
  refetch: () => void;
}

/** `YYYY-MM-DD` → `DD/MM/YYYY`, sin pasar por Date: `new Date("2026-01-05")` es
 *  UTC y en México se pintaría como el día anterior. */
function fmtDate(iso: string | null): string {
  if (!iso) return "Sin caducidad";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX");
}

function sumUnits(lotes: LoteType[]): number {
  return lotes.reduce((sum, l) => sum + l.currentAmount, 0);
}

export function CaducidadesTable({ lotes, refetch }: CaducidadesTableProps) {
  const [tab, setTab] = useState<Tab>("vencidos");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [discarding, setDiscarding] = useState<LoteType[] | null>(null);
  const [ubicacion, setUbicacion] = useState<string>(TODAS);

  const today = todayISO();

  // Ubicaciones presentes en los lotes (la bodega primero), para el filtro.
  const ubicaciones = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lotes) map.set(locKey(l), loteLocationName(l));
    return [...map].sort(([a], [b]) => (a === "bodega" ? -1 : b === "bodega" ? 1 : 0));
  }, [lotes]);

  const enUbicacion = useMemo(
    () => (ubicacion === TODAS ? lotes : lotes.filter((l) => locKey(l) === ubicacion)),
    [lotes, ubicacion]
  );

  // Un lote sin existencia no tiene merma que registrar, aunque esté vencido:
  // se vendió completo y solo le faltó el `state: "agotado"`.
  const { vencidos, porVencer, mermas } = useMemo(() => {
    const activos = enUbicacion.filter((l) => l.state === "activo" && l.currentAmount > 0);
    return {
      vencidos: activos
        .filter((l) => isExpired(l, today))
        .sort((a, b) => (a.expirationDate ?? "").localeCompare(b.expirationDate ?? "")),
      porVencer: activos
        .filter((l) => !isExpired(l, today) && isExpiringSoon(l, EXPIRING_SOON_DAYS, today))
        .sort((a, b) => (a.expirationDate ?? "").localeCompare(b.expirationDate ?? "")),
      mermas: enUbicacion
        .filter((l) => l.state === "vencido")
        .sort((a, b) => (b.discardedAt ?? "").localeCompare(a.discardedAt ?? "")),
    };
  }, [enUbicacion, today]);

  const base = tab === "vencidos" ? vencidos : tab === "porvencer" ? porVencer : mermas;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (l) =>
        l.product?.productName.toLowerCase().includes(q) ||
        l.lotNumber.toLowerCase().includes(q)
    );
  }, [base, search]);

  const selected = useMemo(
    () => vencidos.filter((l) => selectedIds.has(l.documentId)),
    [vencidos, selectedIds]
  );

  const allVisibleSelected =
    rows.length > 0 && rows.every((l) => selectedIds.has(l.documentId));

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) rows.forEach((l) => next.delete(l.documentId));
      else rows.forEach((l) => next.add(l.documentId));
      return next;
    });
  }

  function toggleOne(documentId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      return next;
    });
  }

  function changeTab(value: string) {
    setTab(value as Tab);
    setSelectedIds(new Set());
  }

  function handleDone() {
    setSelectedIds(new Set());
    refetch();
  }

  function exportCSV() {
    const stamp = today;
    if (tab === "mermas") {
      downloadCSV(
        `mermas_${stamp}.csv`,
        ["Producto", "Ubicación", "Lote", "Caducidad", "Cantidad mermada", "Motivo", "Fecha de merma", "Usuario"],
        rows.map((l) => [
          l.product?.productName ?? "—",
          loteLocationName(l),
          l.lotNumber,
          hasRealExpiration(l) ? fmtDate(l.expirationDate) : "Sin caducidad",
          l.discardedQuantity ?? "",
          l.discardReason ? DISCARD_REASON_LABELS[l.discardReason] : "—",
          fmtDateTime(l.discardedAt),
          l.discardedBy ?? "—",
        ])
      );
      return;
    }
    downloadCSV(
      `${tab === "vencidos" ? "lotes_vencidos" : "lotes_por_vencer"}_${stamp}.csv`,
      ["Producto", "Ubicación", "Lote", "Caducidad", "Días", "Existencia del lote", "Stock en la ubicación"],
      rows.map((l) => [
        l.product?.productName ?? "—",
        loteLocationName(l),
        l.lotNumber,
        fmtDate(l.expirationDate),
        l.expirationDate ? daysUntil(l.expirationDate, today) : "",
        l.currentAmount,
        l.product ? loteLocationStock(l) : "",
      ])
    );
  }

  const esMermas = tab === "mermas";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Resumen */}
      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Lotes vencidos</p>
          <p className="text-2xl font-bold text-destructive">{vencidos.length}</p>
          <p className="text-xs text-muted-foreground">{sumUnits(vencidos)} unidad(es) por dar de baja</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Por vencer ({EXPIRING_SOON_DAYS} días)</p>
          <p className="text-2xl font-bold text-amber-600">{porVencer.length}</p>
          <p className="text-xs text-muted-foreground">{sumUnits(porVencer)} unidad(es) en riesgo</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Mermas registradas</p>
          <p className="text-2xl font-bold text-muted-foreground">{mermas.length}</p>
          <p className="text-xs text-muted-foreground">
            {mermas.reduce((s, l) => s + (l.discardedQuantity ?? 0), 0)} unidad(es) desechadas
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList>
            <TabsTrigger value="vencidos">Vencidos ({vencidos.length})</TabsTrigger>
            <TabsTrigger value="porvencer">Por vencer ({porVencer.length})</TabsTrigger>
            <TabsTrigger value="mermas">Mermas ({mermas.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={ubicacion}
            onValueChange={(v) => {
              setUbicacion(v);
              setSelectedIds(new Set());
            }}
          >
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas las ubicaciones</SelectItem>
              {ubicaciones.map(([key, name]) => (
                <SelectItem key={key} value={key}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Buscar producto o lote"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-52 text-sm"
          />
          {tab === "vencidos" && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              disabled={selected.length === 0}
              onClick={() => setDiscarding(selected)}
            >
              <Trash2 className="h-4 w-4" />
              Desechar seleccionados ({selected.length})
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV} disabled={rows.length === 0}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow>
              {tab === "vencidos" && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Seleccionar todos"
                    disabled={rows.length === 0}
                  />
                </TableHead>
              )}
              <TableHead>Producto</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Caducidad</TableHead>
              {esMermas ? (
                <>
                  <TableHead className="text-right">Cantidad mermada</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fecha de merma</TableHead>
                  <TableHead>Usuario</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead className="text-right">Existencia</TableHead>
                  <TableHead className="text-right" title="Stock del producto en la ubicación del lote">Stock ubicación</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  {tab === "vencidos"
                    ? "No hay lotes vencidos con existencia."
                    : tab === "porvencer"
                      ? `Ningún lote caduca en los próximos ${EXPIRING_SOON_DAYS} días.`
                      : "Aún no se ha desechado ningún lote."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((l) => {
                const dias = l.expirationDate ? daysUntil(l.expirationDate, today) : null;
                return (
                  <TableRow key={l.documentId}>
                    {tab === "vencidos" && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(l.documentId)}
                          onCheckedChange={() => toggleOne(l.documentId)}
                          aria-label={`Seleccionar lote ${l.lotNumber}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {l.product?.productName ?? (
                        <span className="text-muted-foreground">Sin producto</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{loteLocationName(l)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/admin/lotes?lote=${encodeURIComponent(l.documentId)}`}
                        className="hover:text-primary hover:underline"
                        title="Rastrear este lote: existencia y ventas"
                      >
                        {l.lotNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {hasRealExpiration(l) ? (
                        fmtDate(l.expirationDate)
                      ) : (
                        <span className="text-muted-foreground">Sin caducidad</span>
                      )}
                    </TableCell>

                    {esMermas ? (
                      <>
                        <TableCell className="text-right tabular-nums">
                          {/* Los lotes marcados a mano antes de esta pantalla no tienen
                              cantidad registrada: "—" es honesto, "0" sería falso. */}
                          {l.discardedQuantity ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {l.discardReason ? DISCARD_REASON_LABELS[l.discardReason] : "—"}
                        </TableCell>
                        <TableCell>{fmtDateTime(l.discardedAt)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {l.discardedBy ?? "—"}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right">
                          {dias === null ? (
                            "—"
                          ) : dias < 0 ? (
                            <Badge variant="destructive">{Math.abs(dias)} d vencido</Badge>
                          ) : (
                            <Badge variant="secondary">{dias} d</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{l.currentAmount}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {l.product ? loteLocationStock(l) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {tab === "vencidos" && l.product && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDiscarding([l])}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Desechar
                            </Button>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DiscardLoteDialog
        lotes={discarding ?? []}
        open={discarding !== null}
        onClose={() => setDiscarding(null)}
        onDone={handleDone}
      />
    </div>
  );
}
