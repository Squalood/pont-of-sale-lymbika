"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { postCaja } from "@/api/postCaja";
import { getUser } from "@/lib/auth";

interface AperturaCajaDialogProps {
  open: boolean;
  onSuccess: () => void;
}

export function AperturaCajaDialog({ open, onSuccess }: AperturaCajaDialogProps) {
  const [fondoInicial, setFondoInicial] = useState("");
  const [tipoCambio, setTipoCambio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fondoNum = parseFloat(fondoInicial);
  const tipoCambioNum = parseFloat(tipoCambio);
  const canSubmit = fondoNum > 0 && tipoCambioNum > 0 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const user = getUser();
      await postCaja({
        fecha: new Date().toISOString(),
        fondoInicial: fondoNum,
        tipoCambio: tipoCambioNum,
        estado: "Abierta",
        operador: user?.username ?? "desconocido",
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al abrir la caja");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        aria-describedby={undefined}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Apertura de Caja</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Ingresa los datos para abrir la caja del día.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="fondo-inicial">Fondo inicial</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="fondo-inicial"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo-cambio">Tipo de cambio (USD → MXN)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="tipo-cambio"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={tipoCambio}
                onChange={(e) => setTipoCambio(e.target.value)}
              />
            </div>
            {tipoCambioNum > 0 && (
              <p className="text-xs text-muted-foreground">
                1 USD = ${tipoCambioNum.toFixed(2)} MXN
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <Button
          className="w-full"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Abriendo caja...
            </>
          ) : (
            "Abrir Caja"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
