import { Building2 } from "lucide-react";
import { MANAGEMENT_FEE_RATE } from "@/lib/pricing";

interface ProveedorInfoProps {
  /** Mercancía a precio de proveedor, antes del fee. */
  feeBase: number;
  managementFee: number;
}

export function ProveedorInfo({ feeBase, managementFee }: ProveedorInfoProps) {
  if (managementFee <= 0) return null;

  return (
    <div className="space-y-1 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-indigo-700">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Precio de proveedor aplicado</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Precio proveedor</span>
        <span>${feeBase.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Management fee ({MANAGEMENT_FEE_RATE * 100}%)</span>
        <span>+${managementFee.toFixed(2)}</span>
      </div>
    </div>
  );
}
