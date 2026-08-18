/**
 * Placeholder a la altura exacta de la gráfica que reemplaza, para que la tarjeta no
 * cambie de tamaño al quedarse sin datos.
 */
export function SinDatos({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-muted-foreground"
      style={{ height }}
    >
      Sin datos en este período
    </div>
  );
}
