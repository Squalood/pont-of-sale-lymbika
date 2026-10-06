"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductsTable } from "@/components/admin/products-table";
import { ServicesTable } from "@/components/admin/services-table";
import { ExportProductsButton } from "@/components/admin/export-products-button";
import { useGetServiceRates } from "@/api/getServiceRates";

type Tab = "productos" | "consultas";

/** Cada pestaña abre su propia colección en el content manager. */
const STRAPI_COLLECTION: Record<Tab, string> = {
  productos: "api::product.product?page=1&pageSize=10&sort=productName%3AASC",
  consultas: "api::service-rate.service-rate?page=1&pageSize=10",
};

export default function ProductosPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const [tab, setTab] = useState<Tab>("productos");
  // Aquí y no en la tabla, para que la pestaña muestre el conteo antes de abrirla.
  const services = useGetServiceRates();

  const strapiUrl = `${backendUrl}/admin/content-manager/collection-types/${STRAPI_COLLECTION[tab]}`;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold">Productos</h1>
        <div className="flex items-center gap-2">
          {tab === "productos" && <ExportProductsButton />}
          <a href={strapiUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Administrar en Strapi
            </Button>
          </a>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="flex-1 min-h-0 gap-4"
      >
        <TabsList className="shrink-0">
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="consultas">
            Consultas{!services.loading && ` (${services.result.length})`}
          </TabsTrigger>
        </TabsList>

        {/* forceMount: cambiar de pestaña no debe tirar la página, filtros ni la
            edición en curso de la tabla de productos. */}
        <TabsContent
          value="productos"
          forceMount
          className="min-h-0 flex flex-col data-[state=inactive]:hidden"
        >
          {/* La tabla pide su propia página al backend: carga y errores viven ahí. */}
          <ProductsTable />
        </TabsContent>
        <TabsContent
          value="consultas"
          forceMount
          className="min-h-0 flex flex-col data-[state=inactive]:hidden"
        >
          <ServicesTable
            services={services.result}
            loading={services.loading}
            error={services.error}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
