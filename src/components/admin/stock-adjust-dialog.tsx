"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AlertTriangle, ArrowLeftRight, Loader2, Minus, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  postStockAdjust,
  StockApiError,
  type StockLocation,
} from "@/api/posStock";

export interface AdjustTarget {
  productDocumentId: string;
  productName: string;
  /** Stock actual en la ubicación, si se conoce. `null` = hay que consultarlo. */
  stock: number | null;
}

interface StockAdjustDialogProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  location: StockLocation;
  locationName: string;
  /** Producto ya elegido (desde una fila). Sin él, el diálogo deja buscar uno. */
  target: AdjustTarget | null;
}

/** Valor del selector "¿Qué corriges?" para el stock sin lote. */
const STOCK = "__stock__";

/** Liga a Traspasos prellenada: bodega → esta farmacia, con el producto ya agregado. */
export function transferHref(pharmacyDocId: string, product?: { productDocumentId: string; productName: string } | null) {
  const q = new URLSearchParams({ to: pharmacyDocId });
  if (product) {
    q.set("product", product.productDocumentId);
    q.set("name", product.productName);
  }
  return `/admin/traspasos?${q.toString()}`;
}

const lotLabel = (l: LoteAt) =>
  `${l.lotNumber ?? "Sin número"}${l.expirationDate ? ` · cad. ${l.expirationDate}` : ""} · ×${l.currentAmount}`;

/**
 * Corrección manual del stock de una ubicación, o de uno de sus lotes. Muestra la cantidad
 * actual y deja llevarla a la nueva con − / + o escribiéndola.
 *
 * - **Stock (sin lote):** cambia el stock de la ubicación y el total. Para faltantes o errores
 *   de conteo que no se pueden atribuir a un lote.
 * - **Un lote:** lote, stock y total se mueven SIEMPRE juntos (rotura o pérdida de ese lote),
 *   así nunca se separan. Para dejar lotes y stock iguales a lo que hay en el anaquel está
 *   "Cuadrar" (conteo físico).
 *
 * Acomodar mercancía que ya existe en una farmacia es un traspaso, no una corrección: el
 * diálogo lo advierte cuando la corrección cambia el total. Se guarda la **diferencia** contra
 * la cantidad mostrada, así una venta hecha con el diálogo abierto no se pierde.
 */
export function StockAdjustDialog({ open, onClose, onDone, location, locationName, target }: StockAdjustDialogProps) {
  const [product, setProduct] = useState<AdjustTarget | null>(target);
  const [search, setSearch] = useState("");
  const [lots, setLots] = useState<LoteAt[] | null>(null);
  const [what, setWhat] = useState<string>(STOCK);
  const [nuevo, setNuevo] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Una llave por intento de guardado: si la red falla y se reintenta, no se aplica dos veces.
  const idemKey = useRef(newIdemKey());
  const { results, loading: searching } = useSearchProducts(product ? "" : search);

  useEffect(() => {
    if (!open) return;
    setProduct(target);
    setSearch("");
    setLots(null);
    setWhat(STOCK);
    setNuevo(target?.stock !== null && target?.stock !== undefined ? String(target.stock) : "");
    setReason("");
    setError(null);
    idemKey.current = newIdemKey();
  }, [open, target]);

  // Producto elegido en el buscador: se consulta cuánto hay en ESTA ubicación. El stock que
  // trae la búsqueda es el total, que no sirve ni para una farmacia ni para la bodega.
  useEffect(() => {
    if (!product || product.stock !== null) return;
    let alive = true;
    setLoadingStock(true);
    getStockLevels(location)
      .then((r) => {
        if (!alive) return;
        const stock = r.items.find((i) => i.productDocumentId === product.productDocumentId)?.stock ?? 0;
        setProduct((p) => (p ? { ...p, stock } : p));
        setNuevo(String(stock));
      })
      .catch(() => alive && setError("No se pudo leer el stock actual"))
      .finally(() => alive && setLoadingStock(false));
    return () => {
      alive = false;
    };
  }, [product, location]);

  // Lotes del producto en esta ubicación, incluidos los agotados (se pueden reponer).
  const productDocId = product?.productDocumentId;
  useEffect(() => {
    if (!productDocId) return;
    let alive = true;
    getLotesAt(productDocId, location, { includeEmpty: true })
      .then((l) => alive && setLots(l))
      .catch(() => alive && setLots([]));
    return () => {
      alive = false;
    };
  }, [productDocId, location]);

  const lot = what === STOCK ? null : lots?.find((l) => l.documentId === what) ?? null;
  const actual = lot ? lot.currentAmount : product?.stock ?? null;
  const n = Number(nuevo.trim());
  const isInt = nuevo.trim() !== "" && Number.isInteger(n);
  const diferencia = actual !== null && isInt ? n - actual : null;
  const valid = Boolean(
    product && diferencia !== null && diferencia !== 0 && (!lot || n >= 0) && reason.trim()
  );

  function choose(value: string) {
    setWhat(value);
    const l = value === STOCK ? null : lots?.find((x) => x.documentId === value);
    const base = l ? l.currentAmount : product?.stock;
    setNuevo(base !== null && base !== undefined ? String(base) : "");
  }

  function step(delta: number) {
    const base = isInt ? n : actual ?? 0;
    const next = base + delta;
    setNuevo(String(lot ? Math.max(0, next) : next));
  }

  async function handleSave() {
    if (!product || !valid || diferencia === null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await postStockAdjust({
        productDocumentId: product.productDocumentId,
        location,
        mode: "delta",
        value: diferencia,
        reason: reason.trim(),
        lotDocumentId: lot?.documentId ?? null,
        idemKey: idemKey.current,
      });
      const after = res.levels[0]?.stock;
      toast.success(`${product.productName}: ${lot ? `lote ${lot.lotNumber ?? ""} corregido` : "stock corregido"}`, {
        description: after !== undefined ? `${locationName} queda en ${after}` : undefined,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof StockApiError ? err.message : "No se pudo guardar la corrección");
    } finally {
      setLoading(false);
    }
  }

  const stockDespues = product?.stock !== null && product?.stock !== undefined && diferencia !== null ? product.stock + diferencia : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Corregir stock · {locationName}</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {location !== null && (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>Esto cambia el stock total.</strong> Úsalo solo para merma, errores de
                  conteo o faltantes. Si la mercancía ya existe y solo la estás acomodando en esta
                  farmacia, haz un <strong>traspaso desde bodega</strong>: mueve las unidades y sus
                  lotes sin cambiar el total.
                </span>
              </p>
              <Button asChild variant="outline" size="sm" className="gap-2 bg-white">
                <Link href={transferHref(location, product)} onClick={onClose}>
                  <ArrowLeftRight className="h-4 w-4" /> Hacer traspaso desde bodega
                </Link>
              </Button>
            </div>
          )}

          {product ? (
            <div className="rounded-md border px-3 py-2 text-sm">
              <p className="truncate font-medium" title={product.productName}>{product.productName}</p>
              {!target && (
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => setProduct(null)}>
                  Cambiar producto
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Producto</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre, sal, SKU o código…"
                  autoFocus
                />
              </div>
              {searching && <p className="text-xs text-muted-foreground">Buscando…</p>}
              {results.length > 0 && (
                <div className="max-h-48 divide-y overflow-y-auto rounded-md border">
                  {results.map((p) => (
                    <button
                      key={p.documentId}
                      type="button"
                      className="w-full truncate px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => setProduct({ productDocumentId: p.documentId, productName: p.productName, stock: null })}
                    >
                      {p.productName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {product && (
            <div className="space-y-1.5">
              <Label>¿Qué corriges?</Label>
              <Select value={what} onValueChange={choose} disabled={lots === null}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STOCK}>El stock (sin lote)</SelectItem>
                  {(lots ?? []).map((l) => (
                    <SelectItem key={l.documentId} value={l.documentId}>
                      Lote {lotLabel(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {product && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">{lot ? `Cantidad actual del lote` : "Cantidad actual"}</span>
                <span className="font-semibold">
                  {loadingStock ? <Loader2 className="inline h-4 w-4 animate-spin" /> : actual ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => step(-1)} disabled={actual === null} aria-label="Restar uno">
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  className="w-28 text-center text-lg font-semibold"
                  inputMode="numeric"
                  value={nuevo}
                  onChange={(e) => setNuevo(e.target.value.replace(lot ? /[^\d]/g : /[^\d-]/g, ""))}
                  disabled={actual === null}
                  aria-label="Cantidad nueva"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => step(1)} disabled={actual === null} aria-label="Sumar uno">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-xs">
                {diferencia === null || diferencia === 0 ? (
                  <span className="text-muted-foreground">Sin cambios</span>
                ) : (
                  <span className={diferencia > 0 ? "font-medium text-emerald-700" : "font-medium text-destructive"}>
                    Diferencia: {diferencia > 0 ? `+${diferencia}` : diferencia}
                    {lot && stockDespues !== null && ` · stock de ${locationName}: ${product.stock} → ${stockDespues}`}
                    {` · el total también ${diferencia > 0 ? "sube" : "baja"}`}
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="adjust-reason">Motivo</Label>
            <Textarea
              id="adjust-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Merma, rotura, error de conteo…"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!valid || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar corrección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
