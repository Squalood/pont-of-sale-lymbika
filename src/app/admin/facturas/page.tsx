"use client";

import { useCallback, useState } from "react";
import { useGetProducts } from "@/api/getProducts";
import { useGetFacturas } from "@/api/getFacturas";
import { InvoiceForm } from "@/components/admin/invoice-form";
import { FacturasTable } from "@/components/admin/facturas-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FacturasPage() {
  const { result: products } = useGetProducts();
  const { result: facturas, loading, error } = useGetFacturas();
  const [tab, setTab] = useState("nueva");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setTab("historial");
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="nueva">Nueva Factura</TabsTrigger>
          <TabsTrigger value="historial">
            Historial
            {facturas.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                {facturas.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nueva" className="flex-1 min-h-0 flex flex-col mt-4">
          <InvoiceForm products={products} onSaved={handleSaved} />
        </TabsContent>

        <TabsContent value="historial" className="flex-1 min-h-0 overflow-y-auto mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando historial...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <FacturasTable key={refreshKey} facturas={facturas} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
