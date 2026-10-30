"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { LotTraceView } from "@/components/admin/lot-trace-view";
import { useSearchLotes } from "@/api/searchLotes";
import { fmtCaducidad } from "@/lib/venta-lotes";
import { cn } from "@/lib/utils";

function RastreoLotes() {
  const router = useRouter();
  // El lote abierto vive en la URL: así el detalle de una venta o Caducidades pueden enlazarlo.
  const selected = useSearchParams().get("lote");
  const [term, setTerm] = useState("");
  const { results, loading, error } = useSearchLotes(term);

  function select(documentId: string) {
    router.replace(`/admin/lotes?lote=${encodeURIComponent(documentId)}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold">Rastreo de lotes</h1>
        <p className="text-sm text-muted-foreground">
          Busca un lote por número o por producto, incluidos los agotados y mermados, para ver dónde queda
          existencia y en qué ventas salió. Úsalo ante un retiro de lote o una queja.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 gap-6">
        <div className="flex w-80 shrink-0 flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Número de lote o producto"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {term.trim().length < 2 ? (
              <p className="px-1 text-xs text-muted-foreground">Escribe al menos 2 caracteres.</p>
            ) : loading ? (
              <div className="flex justify-center py-6">
                <Spinner className="size-5 text-primary" />
              </div>
            ) : error ? (
              <p className="px-1 text-xs text-destructive">Error al buscar lotes: {error}</p>
            ) : results.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">Sin lotes que coincidan.</p>
            ) : (
              results.map((g) => {
                const cad = fmtCaducidad(g.expirationDate);
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => select(g.documentId)}
                    className={cn(
                      "w-full rounded-md border bg-white px-3 py-2 text-left text-sm hover:bg-muted/50",
                      selected === g.documentId && "border-primary ring-1 ring-primary"
                    )}
                  >
                    <p className="truncate font-medium">{g.productName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-mono">{g.lotNumber ?? "sin número"}</span>
                      {cad ? ` · Cad. ${cad}` : ""} · {g.currentAmount} en existencia
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{g.locations.join(", ")}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {selected ? (
            <LotTraceView key={selected} lotDocumentId={selected} />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Elige un lote para ver su historia.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LotesPage() {
  // useSearchParams necesita un límite de Suspense para que Next pueda prerenderizar la página.
  return (
    <Suspense fallback={null}>
      <RastreoLotes />
    </Suspense>
  );
}
