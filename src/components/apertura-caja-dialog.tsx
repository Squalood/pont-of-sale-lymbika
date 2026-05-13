"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { postCaja } from "@/api/postCaja";
import { fetchCajaAbierta } from "@/api/getCajaAbierta";
import { fetchPharmacies } from "@/api/getPharmacies";
import { getUser } from "@/lib/auth";
import { PharmacyType } from "@/types/pharmacy";

interface AperturaCajaDialogProps {
  open: boolean;
  onSuccess: () => void;
}

export function AperturaCajaDialog({ open, onSuccess }: AperturaCajaDialogProps) {
  const [fondoInicial, setFondoInicial] = useState("");
  const [tipoCambio, setTipoCambio] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pharmacies, setPharmacies] = useState<PharmacyType[]>([]);
  const [pharmacyId, setPharmacyId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setChecking(true);
    fetchCajaAbierta()
      .then((existente) => { if (existente) onSuccess(); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [open, onSuccess]);

  useEffect(() => {
    if (!open) return;
    fetchPharmacies()
      .then((data) => {
        setPharmacies(data);
        if (data.length === 1) setPharmacyId(data[0].documentId);
      })
      .catch(() => {});
  }, [open]);

  const fondoNum = parseFloat(fondoInicial);
  const tipoCambioNum = parseFloat(tipoCambio);
  const canSubmit = fondoNum > 0 && tipoCambioNum > 0 && !!pharmacyId && !loading && !checking;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const existente = await fetchCajaAbierta();
      if (existente) {
        onSuccess();
        return;
      }
      const user = getUser();
      await postCaja({
        fecha: new Date().toISOString(),
        fondoInicial: fondoNum,
        tipoCambio: tipoCambioNum,
        estado: "Abierta",
        operador: user?.username ?? "desconocido",
        pharmacy: pharmacyId,
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
          {!checking && (
            <p className="text-sm text-muted-foreground">
              Ingresa los datos para abrir la caja del día.
            </p>
          )}
        </DialogHeader>

        {checking && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verificando caja...</p>
          </div>
        )}

        <div className={checking ? "hidden" : "space-y-5 py-2"}>
          <div className="space-y-2">
            <Label>Farmacia</Label>
            <Select value={pharmacyId} onValueChange={setPharmacyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una farmacia" />
              </SelectTrigger>
              <SelectContent>
                {pharmacies.map((p) => (
                  <SelectItem key={p.documentId} value={p.documentId}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
          className={`w-full${checking ? " hidden" : ""}`}
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
