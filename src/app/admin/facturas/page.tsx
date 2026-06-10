"use client";

import { useGetProducts } from "@/api/getProducts";
import { InvoiceForm } from "@/components/admin/invoice-form";

export default function FacturasPage() {
  const { result: products } = useGetProducts();

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <InvoiceForm products={products} />
    </div>
  );
}
