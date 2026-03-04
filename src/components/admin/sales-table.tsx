"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SaleDetailDialog } from "@/components/admin/sale-detail-dialog";
import { VentaType } from "@/types/venta";
import { ProductType } from "@/types/product";

interface SalesTableProps {
  ventas: VentaType[];
  products: ProductType[];
  onReturnComplete: (returnedItems: { productId: number; quantity: number }[]) => void;
}

type Period = "hoy" | "semana" | "mes" | "todo";

export function SalesTable({ ventas, products, onReturnComplete }: SalesTableProps) {
  const [period, setPeriod] = useState<Period>("hoy");
  const [selectedVenta, setSelectedVenta] = useState<VentaType | null>(null);
  const [operadorFilter, setOperadorFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");

  const operadores = useMemo(() => {
    const unique = Array.from(new Set(ventas.map((v) => v.operador).filter(Boolean)));
    return unique.sort();
  }, [ventas]);

  const filteredVentas = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return ventas.filter((v) => {
      const fecha = new Date(v.fecha);
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
      const matchesOperador = operadorFilter === "todos" || v.operador === operadorFilter;
      const matchesSearch = search === "" || String(v.id).padStart(5, "0").includes(search.replace(/^#/, ""));
      return matchesPeriod && matchesOperador && matchesSearch;
    });
  }, [ventas, period, operadorFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Historial de ventas</h2>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar por # recibo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-44 h-8 text-sm"
          />
          <Select value={operadorFilter} onValueChange={setOperadorFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {operadores.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <TableHead>Fecha / Hora</TableHead>
              <TableHead className="text-center"># Items</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVentas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay ventas en este período
                </TableCell>
              </TableRow>
            ) : (
              filteredVentas.map((venta) => {
                const fecha = new Date(venta.fecha);
                const itemCount = venta.venta?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

                return (
                  <TableRow
                    key={venta.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedVenta(venta)}
                  >
                    <TableCell>
                      <div className="text-sm font-medium">
                        {fecha.toLocaleDateString("es-MX")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{itemCount}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {venta.metodoPago}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {venta.operador ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${venta.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={venta.estado === "completada" ? "default" : "destructive"}
                      >
                        {venta.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <SaleDetailDialog
        venta={selectedVenta}
        open={!!selectedVenta}
        onClose={() => setSelectedVenta(null)}
        products={products}
        onReturnComplete={onReturnComplete}
      />
    </div>
  );
}
