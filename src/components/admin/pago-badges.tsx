import { Badge } from "@/components/ui/badge";
import { ventaPagoPartes } from "@/lib/checkout-math";
import { fmtMoney } from "@/lib/format";
import { VentaType } from "@/types/venta";

/**
 * Un badge por método realmente usado. Con un solo método basta el nombre; con varios se
 * agrega el monto de cada uno, que es lo que se busca al cuadrar contra la terminal.
 * Lo usan el historial y el detalle de la venta para que se lean igual.
 */
export function PagoBadges({ venta }: { venta: VentaType }) {
  const partes = ventaPagoPartes(venta);
  return (
    <>
      {partes.map((p) => (
        <Badge key={p.tipo} variant="outline" className="gap-1 font-normal">
          <span className="font-medium">{p.label}</span>
          {partes.length > 1 && (
            <span className="tabular-nums text-muted-foreground">
              {fmtMoney(p.monto)}
              {p.moneda === "USD" ? " USD" : ""}
            </span>
          )}
        </Badge>
      ))}
    </>
  );
}
