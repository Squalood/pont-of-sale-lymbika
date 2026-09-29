"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchProducts } from "@/api/searchProducts";
import { getLotesAt, type LoteAt } from "@/api/getLotesAt";
import {
  getStockLevels,
  newIdemKey,
  postStockTransfer,
  StockApiError,
} from "@/api/posStock";
import type { PharmacyType } from "@/types/pharmacy";
import { BODEGA, LocationSelect, locationName, toLocation } from "./location-select";

const AUTO = "auto";

interface Line {
  productDocumentId: string;
  productName: string;
  quantity: string;
  /** `AUTO` = el servidor elige por caducidad (FEFO). */
  lot: string;
  lots: LoteAt[] | null;
}

interface TransferFormProps {
  pharmacies: PharmacyType[];
  defaultTo: string;
  onDone: () => void;
}

/**
 * Traspaso inmediato entre ubicaciones. El servidor valida que el origen tenga stock, mueve las
 * unidades y los lotes (partiendo un lote si es parcial, con su número y caducidad) y deja un
 * registro por porción en el historial. Si algo no alcanza, no se mueve nada.
 */
export function TransferForm({ pharmacies, defaultTo, onDone }: TransferFormProps) {
  const [from, setFrom] = useState<string>(BODEGA);
  const [to, setTo] = useState<string>(defaultTo === BODEGA ? "" : defaultTo);
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [originStock, setOriginStock] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Misma llave mientras no cambie el contenido: un reintento tras un fallo de red no duplica.
  const idemKey = useRef(newIdemKey());
  // Lotes que ya se están pidiendo, para no repetir la petición en cada render.
  const lotsInFlight = useRef(new Set<string>());
  const { results, loading: searching } = useSearchProducts(search);

  // Prellenado desde "Traspasar" (Stock por farmacia) o "Hacer traspaso desde bodega" (Corregir
  // stock): ?to=<farmacia>&product=<documentId>&name=<nombre>. El origen siempre es la bodega,
  // que es de donde sale la mercancía que se está acomodando.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const preTo = q.get("to");
    const preProduct = q.get("product");
    if (preTo) {
      setFrom(BODEGA);
      setTo(preTo);
    }
    if (preProduct) {
      setLines([
        { productDocumentId: preProduct, productName: q.get("name") ?? "Producto", quantity: "1", lot: AUTO, lots: null },
      ]);
    }
  }, []);

  useEffect(() => {
    if (!to && defaultTo && defaultTo !== BODEGA) setTo(defaultTo);
  }, [defaultTo, to]);

  // Stock disponible en el origen, para mostrarlo en cada línea.
  useEffect(() => {
    let alive = true;
    getStockLevels(toLocation(from))
      .then((r) => alive && setOriginStock(new Map(r.items.map((i) => [i.productDocumentId, i.stock]))))
      .catch(() => alive && setOriginStock(new Map()));
    return () => {
      alive = false;
    };
  }, [from]);

  // Los lotes dependen del origen: al cambiarlo se recargan y se vuelve a "automático".
  useEffect(() => {
    setLines((prev) => prev.map((l) => ({ ...l, lot: AUTO, lots: null })));
  }, [from]);
  useEffect(() => {
    lines.forEach((l, idx) => {
      if (l.lots !== null) return;
      const key = `${from}|${l.productDocumentId}|${idx}`;
      if (lotsInFlight.current.has(key)) return;
      lotsInFlight.current.add(key);
      getLotesAt(l.productDocumentId, toLocation(from))
        .then((lots) =>
          setLines((prev) => prev.map((x, i) => (i === idx && x.productDocumentId === l.productDocumentId ? { ...x, lots } : x)))
        )
        .catch(() =>
          setLines((prev) => prev.map((x, i) => (i === idx && x.productDocumentId === l.productDocumentId ? { ...x, lots: [] } : x)))
        )
        .finally(() => lotsInFlight.current.delete(key));
    });
  }, [lines, from]);

  useEffect(() => {
    idemKey.current = newIdemKey();
  }, [from, to, lines, notes]);

  function addProduct(p: { documentId: string; productName: string }) {
    setSearch("");
    if (lines.some((l) => l.productDocumentId === p.documentId && l.lot === AUTO)) return;
    setLines((prev) => [...prev, { productDocumentId: p.documentId, productName: p.productName, quantity: "1", lot: AUTO, lots: null }]);
  }

  const parsed = useMemo(
    () =>
      lines.map((l) => {
        const qty = Number(l.quantity);
        const available = originStock.get(l.productDocumentId) ?? 0;
        const lotMax = l.lot === AUTO ? null : l.lots?.find((x) => x.documentId === l.lot)?.currentAmount ?? null;
        const validQty = Number.isInteger(qty) && qty > 0;
        return { ...l, qty, available, lotMax, validQty };
      }),
    [lines, originStock]
  );
  // El servidor valida contra el total del producto; aquí se avisa antes de enviar.
  const pedidoPorProducto = new Map<string, number>();
  parsed.forEach((l) => l.validQty && pedidoPorProducto.set(l.productDocumentId, (pedidoPorProducto.get(l.productDocumentId) ?? 0) + l.qty));
  const excedidos = parsed.filter((l) => (pedidoPorProducto.get(l.productDocumentId) ?? 0) > l.available);

  const disabledReason =
    !to
        ? "Elige el destino."
        : from === to
          ? "Origen y destino deben ser distintos."
          : lines.length === 0
            ? "Agrega al menos un producto."
            : parsed.some((l) => !l.validQty)
              ? "Cada línea necesita una cantidad entera mayor a 0."
              : excedidos.length > 0
                ? "Hay productos sin stock suficiente en el origen."
                : null;

  async function handleSubmit() {
    if (disabledReason) return;
    setLoading(true);
    setError(null);
    try {
      const res = await postStockTransfer({
        from: toLocation(from),
        to: toLocation(to),
        lines: parsed.map((l) => ({
          productDocumentId: l.productDocumentId,
          quantity: l.qty,
          lotDocumentId: l.lot === AUTO ? null : l.lot,
        })),
        notes: notes.trim() || undefined,
        idemKey: idemKey.current,
      });
      const unidades = parsed.reduce((s, l) => s + l.qty, 0);
      toast.success("Traspaso registrado", {
        description: `${locationName(from, pharmacies)} → ${locationName(to, pharmacies)} · ${parsed.length} línea(s) · ${unidades} unidad(es)${res.duplicate ? " (ya estaba aplicado)" : ""}`,
      });
      setLines([]);
      setNotes("");
      idemKey.current = newIdemKey();
      getStockLevels(toLocation(from))
        .then((r) => setOriginStock(new Map(r.items.map((i) => [i.productDocumentId, i.stock]))))
        .catch(() => undefined);
      onDone();
    } catch (err) {
      setError(err instanceof StockApiError ? err.message : "No se pudo registrar el traspaso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Origen</Label>
          <LocationSelect value={from} onChange={setFrom} pharmacies={pharmacies} exclude={to} className="w-56" />
        </div>
        <ArrowRight className="mb-2.5 h-4 w-4 text-muted-foreground" />
        <div className="space-y-1.5">
          <Label>Destino</Label>
          {to ? (
            <LocationSelect value={to} onChange={setTo} pharmacies={pharmacies} exclude={from} className="w-56" />
          ) : (
            <Select value="" onValueChange={setTo}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Elegir destino…" />
              </SelectTrigger>
              <SelectContent>
                {from !== BODEGA && <SelectItem value={BODEGA}>Bodega central</SelectItem>}
                {pharmacies
                  .filter((p) => p.documentId !== from)
                  .map((p) => (
                    <SelectItem key={p.documentId} value={p.documentId}>
                      {p.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Agregar producto: nombre, sal, SKU o código…" />
        {(searching || results.length > 0) && search.trim() && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border bg-background shadow-md">
            {searching && results.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>}
            {results.map((p) => (
              <button
                key={p.documentId}
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => addProduct(p)}
              >
                <span className="min-w-0 flex-1 truncate">{p.productName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  En origen: {originStock.get(p.documentId) ?? 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {lines.length > 0 && (
        <div className="divide-y rounded-md border">
          {parsed.map((l, idx) => {
            const excedido = (pedidoPorProducto.get(l.productDocumentId) ?? 0) > l.available;
            return (
              <div key={`${l.productDocumentId}-${idx}`} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={l.productName}>{l.productName}</p>
                  <p className={`text-xs ${excedido ? "text-destructive" : "text-muted-foreground"}`}>
                    Disponible en origen: {l.available}
                    {l.lotMax !== null && ` · en el lote: ${l.lotMax}`}
                  </p>
                </div>
                <Select
                  value={l.lot}
                  onValueChange={(v) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, lot: v } : x)))}
                >
                  <SelectTrigger className="h-8 w-56 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO}>Lote automático (caduca primero)</SelectItem>
                    {(l.lots ?? []).map((lot) => (
                      <SelectItem key={lot.documentId} value={lot.documentId}>
                        {lot.lotNumber ?? "Sin número"} · {lot.expirationDate ?? "sin caducidad"} · ×{lot.currentAmount}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="h-8 w-20 text-center"
                  inputMode="numeric"
                  value={l.quantity}
                  onChange={(e) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))}
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                  title="Quitar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="transfer-notes">Notas (opcional)</Label>
        <Textarea id="transfer-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reabasto semanal, corrección de negativo…" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {disabledReason && lines.length > 0 && <p className="text-xs text-muted-foreground">{disabledReason}</p>}
        <Button onClick={handleSubmit} disabled={!!disabledReason || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar traspaso
        </Button>
      </div>
    </div>
  );
}
