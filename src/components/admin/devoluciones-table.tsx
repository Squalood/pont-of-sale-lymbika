"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DevolucionType } from "@/types/devolucion";
import { DevolucionDetailDialog } from "@/components/admin/devolucion-detail-dialog";

interface DevolucionesTableProps {
  devoluciones: DevolucionType[];
}

type Period = "hoy" | "semana" | "mes" | "todo";

export function DevolucionesTable({ devoluciones }: DevolucionesTableProps) {
  const [period, setPeriod] = useState<Period>("hoy");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DevolucionType | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return devoluciones.filter((d) => {
      const fecha = new Date(d.fecha);
      const matchesPeriod = (() => {
        switch (period) {
          case "hoy":
            return fecha >= today;
          case "semana": {
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return fecha >= weekAgo;
          }
          case "mes": {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return fecha >= monthStart;
          }
          default:
            return true;
        }
      })();
      const matchesSearch =
        search === "" || String(d.id).padStart(5, "0").includes(search.replace(/^#/, ""));
      return matchesPeriod && matchesSearch;
    });
  }, [devoluciones, period, search]);

  const totalReembolsado = filtered.reduce((sum, d) => sum + d.montoReembolso, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Historial de devoluciones</h2>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar por # dev."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40 h-8 text-sm"
          />
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="hoy">Hoy</TabsTrigger>
              <TabsTrigger value="semana">Semana</TabsTrigger>
              <TabsTrigger value="mes">Mes</TabsTrigger>
              <TabsTrigger value="todo">Todo</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead># Dev.</TableHead>
              <TableHead>Fecha / Hora</TableHead>
              <TableHead># Venta</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Reembolso</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No hay devoluciones en este período
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((dev) => {
                const fecha = new Date(dev.fecha);
                return (
                  <TableRow key={dev.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(dev)}>
                    <TableCell className="font-medium text-muted-foreground">
                      #{String(dev.id).padStart(5, "0")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {fecha.toLocaleDateString("es-MX")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dev.venta ? `#${String(dev.venta.id).padStart(5, "0")}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{dev.metodo}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dev.operador ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                      {dev.motivo || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${dev.montoReembolso.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={dev.estado === "Completada" ? "default" : "destructive"}>
                        {dev.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <div className="flex justify-end text-sm">
          <span className="text-muted-foreground">
            Total reembolsado:{" "}
            <span className="font-semibold text-foreground">${totalReembolsado.toFixed(2)}</span>
          </span>
        </div>
      )}

      <DevolucionDetailDialog
        devolucion={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
