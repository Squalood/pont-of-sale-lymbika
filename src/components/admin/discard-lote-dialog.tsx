"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { discardLotes, stockEffects } from "@/lib/discard-lotes";
import { DISCARD_REASONS, DISCARD_REASON_LABELS } from "@/types/lote";
import type { DiscardReason, LoteType } from "@/types/lote";

interface DiscardLoteDialogProps {
  lotes: LoteType[];
  open: boolean;
  onClose: () => void;
  /** Se llama tras una operación con al menos un lote marcado, para refrescar. */
  onDone: () => void;
}

export function DiscardLoteDialog({ lotes, open, onClose, onDone }: DiscardLoteDialogProps) {
  const [reason, setReason] = useState<DiscardReason>("expired");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("expired");
    setError(null);
  }, [open]);

  const effects = useMemo(() => stockEffects(lotes), [lotes]);
  const totalUnidades = effects.reduce((sum, e) => sum + e.quantity, 0);
  const huerfanos = lotes.filter((l) => !l.product).length;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await discardLotes(lotes, reason);
    setLoading(false);

    if (res.ok === 0) {
      setError(
        `No se pudo desechar ningún lote. Revisa la conexión y los permisos de Strapi.`
      );
      return;
    }

    if (res.failed.length > 0 || res.stockFailed.length > 0) {
      const partes = [`${res.ok} lote(s) desechado(s)`];
      if (res.failed.length > 0) partes.push(`${res.failed.length} no se marcaron`);
      if (res.stockFailed.length > 0)
        partes.push(`${res.stockFailed.length} producto(s) sin ajustar el stock`);
      toast.warning(`${partes.join(", ")}. Corre la reconciliación de lotes.`);
    } else {
      toast.success(
        `${res.ok} lote(s) desechado(s) · ${totalUnidades} unidad(es) dadas de baja.`
      );
    }

    onDone();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            Desechar {lotes.length} lote{lotes.length === 1 ? "" : "s"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as DiscardReason)}>
              <SelectTrigger id="motivo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISCARD_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {DISCARD_REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se aplica a todos los lotes seleccionados.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Efecto en el stock</Label>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
              {effects.map((e) => (
                <div key={`${e.productDocumentId}|${e.locationName}`} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">
                      {e.productName}
                      <span className="font-normal text-muted-foreground"> · {e.locationName}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                      <span className="text-muted-foreground">{e.before}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-semibold text-destructive">{e.after}</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {e.lotes.map((l) => `${l.lotNumber} (${l.currentAmount})`).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {huerfanos > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {huerfanos} lote(s) sin producto asociado se omitirán: no hay stock que
                ajustar.
              </span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            El lote queda registrado como merma con la cantidad dada de baja. No se
            elimina, así que el historial se conserva.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || effects.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Desechar {totalUnidades} unidad{totalUnidades === 1 ? "" : "es"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
