import { Badge } from "@/components/ui/badge";
import type { FacturaType } from "@/types/factura";

export function EstadoFacturaBadge({ estado }: { estado: FacturaType["estado"] | null | undefined }) {
  if (estado === "borrador") {
    return <Badge variant="outline" className="border-dashed text-muted-foreground">borrador</Badge>;
  }
  return (
    <Badge variant={estado === "cancelada" ? "destructive" : "default"}>
      {estado ?? "emitida"}
    </Badge>
  );
}
