"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ForbiddenError } from "@/lib/auth";
import { downloadProductsCsv } from "@/api/productsCsv";

export function ExportProductsButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const blob = await downloadProductsCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `productos_${new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err instanceof ForbiddenError
          ? "Tu usuario no tiene permiso para exportar productos"
          : "No se pudo exportar el CSV"
      );
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
