import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface CheckoutActionsProps {
  onCancel: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
  isLoading: boolean;
}

export function CheckoutActions({ onCancel, onConfirm, canConfirm, isLoading }: CheckoutActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      <Button variant="outline" className="h-12" onClick={onCancel}>
        Cancelar
      </Button>
      <Button
        className="h-12 bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={!canConfirm || isLoading}
        onClick={onConfirm}
      >
        {isLoading ? <Spinner data-icon="inline-start" /> : null}
        {isLoading ? "Procesando..." : "Confirmar Pago"}
      </Button>
    </div>
  );
}
