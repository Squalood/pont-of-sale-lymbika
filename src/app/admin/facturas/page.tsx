"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useGetFacturas } from "@/api/getFacturas";
import { FacturasTable } from "@/components/admin/facturas-table";
import { NewInvoiceDialog } from "@/components/admin/new-invoice-dialog";
import type { FacturaType } from "@/types/factura";

export default function FacturasPage() {
  const { result: facturas, loading, error, refetch } = useGetFacturas();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FacturaType | null>(null);
  const [openCount, setOpenCount] = useState(0);

  function openNueva() {
    setEditing(null);
    setOpenCount((n) => n + 1);
    setDialogOpen(true);
  }

  function openEditar(factura: FacturaType) {
    setEditing(factura);
    setOpenCount((n) => n + 1);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 flex-1 min-h-0 overflow-y-auto">
      <h1 className="text-2xl font-bold">Facturas</h1>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center text-destructive">
          <p>{error}</p>
        </div>
      ) : (
        <FacturasTable
          facturas={facturas}
          onNuevaFactura={openNueva}
          onEditar={openEditar}
        />
      )}

      {/* El `key` cambia en cada apertura: el formulario se remonta y lee el borrador tal
          como quedó tras el último refetch, en vez de lo que tenía antes de guardarlo. */}
      <NewInvoiceDialog
        key={openCount}
        open={dialogOpen}
        factura={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
