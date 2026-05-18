"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ExportProductsButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/export/products`,
        {
          headers: {
            Authorization: process.env.NEXT_PUBLIC_EXPORT_TOKEN ?? "",
          },
        }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "productos.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo exportar el CSV");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleExport}
      disabled={loading}
    >
      <Download className="h-4 w-4" />
      {loading ? "Exportando…" : "Exportar CSV"}
    </Button>
  );
}
