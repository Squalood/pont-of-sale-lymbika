"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetCajas } from "@/api/getCajas";
import { CajaDetailDialog } from "@/components/admin/caja-detail-dialog";
import { CajaType } from "@/types/caja";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default function CajasPage() {
  const { result: cajas, loading, error } = useGetCajas();
  const [selectedCaja, setSelectedCaja] = useState<CajaType | null>(null);

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4">
      <h1 className="text-2xl font-bold shrink-0">Historial de Cajas</h1>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!loading && !error && (
        <div className="flex-1 min-h-0 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apertura</TableHead>
                <TableHead>Farmacia</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead className="text-right">Fondo inicial</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cajas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Sin registros
                  </TableCell>
                </TableRow>
              )}
              {cajas.map((caja) => (
                <TableRow
                  key={caja.documentId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedCaja(caja)}
                >
                  <TableCell>{fmtDate(caja.fecha)}</TableCell>
                  <TableCell>{caja.pharmacy?.nombre ?? "—"}</TableCell>
                  <TableCell>{caja.operador}</TableCell>
                  <TableCell className="text-right">
                    ${caja.fondoInicial.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={caja.estado === "Abierta" ? "default" : "secondary"}
                      className={caja.estado === "Abierta" ? "bg-emerald-500 hover:bg-emerald-500" : ""}
                    >
                      {caja.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CajaDetailDialog
        caja={selectedCaja}
        open={selectedCaja !== null}
        onClose={() => setSelectedCaja(null)}
      />
    </div>
  );
}
