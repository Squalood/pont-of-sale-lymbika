"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useGetCompras } from "@/api/getCompras";
import { ComprasTable } from "@/components/admin/compras-table";
import { NewPurchaseDialog } from "@/components/admin/new-purchase-dialog";

export default function ComprasPage() {
  const { result: compras, loading, error, refetch } = useGetCompras();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6 flex-1 min-h-0 overflow-y-auto">
      <h1 className="text-2xl font-bold">Compras</h1>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center text-destructive">
          <p>{error}</p>
        </div>
      ) : (
        <ComprasTable
          compras={compras}
          onNuevaCompra={() => setDialogOpen(true)}
        />
      )}

      {/* El diálogo busca sus productos en el backend y ya patcheó el stock al
          confirmar: aquí solo queda recargar el historial. */}
      <NewPurchaseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCompraComplete={refetch}
      />
    </div>
  );
}
