import { Building2 } from "lucide-react";
import { MANAGEMENT_FEE_RATE } from "@/lib/pricing";

interface ProveedorInfoProps {
  /** Mercancía a precio de proveedor, sin el fee. */
  feeBase: number;
  /** Fee ya contenido en el total, no un cargo aparte. */
  managementFee: number;
}

/**
 * Desglose informativo del total en tarifa de proveedor. El fee ya viene dentro del precio
 * de cada línea, así que esto solo explica cuánto del total cobrado es fee.
 */
export function ProveedorInfo({ feeBase, managementFee }: ProveedorInfoProps) {
  if (managementFee <= 0) return null;

  return (
    <div className="space-y-1 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-indigo-700">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Precio de proveedor aplicado</span>
      </div>
      <p className="text-xs">
        El management fee ya está incluido en el precio de cada producto.
      </p>
      <div className="flex items-center justify-between text-sm">
        <span>Precio proveedor</span>
        <span>${feeBase.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Management fee ({MANAGEMENT_FEE_RATE * 100}%)</span>
        <span>${managementFee.toFixed(2)}</span>
      </div>
    </div>
  );
}
