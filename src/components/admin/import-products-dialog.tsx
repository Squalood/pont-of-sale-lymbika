"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ForbiddenError } from "@/lib/auth";
import { fmtInt } from "@/lib/format";
import { importProductsCsv, type ImportResult } from "@/api/productsCsv";

type Paso = "elegir" | "revisando" | "revisado" | "importando" | "listo";

/**
 * Importar productos desde un CSV (normalmente el mismo del botón "Exportar CSV", editado en
 * Excel). Siempre en dos pasos: primero el backend revisa el archivo sin guardar nada
 * (`dryRun`) y se muestra qué va a cambiar y qué filas tienen errores; solo después se
 * importa de verdad. Una fila con errores se salta entera, así que importar con errores es
 * seguro: se aplican solo las filas válidas.
 */
export function ImportProductsButton({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [paso, setPaso] = useState<Paso>("elegir");
  const [revision, setRevision] = useState<ImportResult | null>(null);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ocupado = paso === "revisando" || paso === "importando";
  const reporte = resultado ?? revision;
  const filasValidas = revision ? revision.updated + revision.created : 0;

  function reiniciar() {
    setFile(null);
    setPaso("elegir");
    setRevision(null);
    setResultado(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function cerrar() {
    if (ocupado) return;
    setOpen(false);
    reiniciar();
  }

  function mensajeDeError(err: unknown, accion: string) {
    return err instanceof ForbiddenError
      ? `Tu usuario no tiene permiso para ${accion} productos`
      : err instanceof Error
        ? err.message
        : `No se pudo ${accion} el archivo`;
  }

  async function revisar() {
    if (!file) return;
    setPaso("revisando");
    setError(null);
    try {
      setRevision(await importProductsCsv(file, { dryRun: true }));
      setPaso("revisado");
    } catch (err) {
      setError(mensajeDeError(err, "revisar"));
      setPaso("elegir");
    }
  }

  async function importar() {
    if (!file) return;
    setPaso("importando");
    setError(null);
    try {
      const r = await importProductsCsv(file, { dryRun: false });
      setResultado(r);
      setPaso("listo");
      onImported();
      const resumen = `${fmtInt(r.updated)} actualizados, ${fmtInt(r.created)} nuevos`;
      if (r.errors.length) {
        toast.warning("Importación con filas saltadas", {
          description: `${resumen}; ${fmtInt(r.errors.length)} filas con error no se aplicaron`,
        });
      } else {
        toast.success("Importación completada", { description: resumen });
      }
    } catch (err) {
      // Si la conexión se corta a la mitad, las filas ya procesadas sí se guardaron (cada
      // una es independiente). Volver a importar el mismo archivo es seguro.
      setError(
        `${mensajeDeError(err, "importar")}. Puede que una parte sí se haya guardado; ` +
          "puedes volver a importar el mismo archivo sin riesgo."
      );
      setPaso("revisado");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        Importar CSV
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar productos desde CSV</DialogTitle>
            <DialogDescription>
              Solo cambia las columnas que traiga el archivo: una celda vacía no cambia nada y
              un guion (-) borra el valor. El stock no se importa. Primero se revisa el archivo
              sin guardar nada.
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-4 text-sm">
            <Input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              disabled={ocupado || paso === "listo"}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPaso("elegir");
                setRevision(null);
                setResultado(null);
                setError(null);
              }}
            />

            {ocupado && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {paso === "revisando"
                  ? "Revisando el archivo…"
                  : "Importando… con muchos productos puede tardar varios minutos. No cierres esta ventana."}
              </div>
            )}

            {reporte && !ocupado && (
              <>
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  <p className="mb-1 flex items-center gap-1.5 font-medium">
                    {paso === "listo" ? (
                      <><CheckCircle2 className="h-4 w-4 text-green-600" /> Importado</>
                    ) : (
                      "Revisión (todavía no se guardó nada)"
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    <span>{paso === "listo" ? "Actualizados" : "Se actualizarán"}</span>
                    <span className="text-right font-semibold">{fmtInt(reporte.updated)}</span>
                    <span>{paso === "listo" ? "Creados" : "Productos nuevos"}</span>
                    <span className="text-right font-semibold">{fmtInt(reporte.created)}</span>
                    <span>{paso === "listo" ? "Publicados" : "Se publicarán"}</span>
                    <span className="text-right font-semibold">{fmtInt(reporte.published)}</span>
                    <span className={reporte.errors.length ? "text-destructive" : ""}>
                      Filas con error {paso !== "listo" && "(se saltan)"}
                    </span>
                    <span className={`text-right font-semibold ${reporte.errors.length ? "text-destructive" : ""}`}>
                      {fmtInt(reporte.errors.length)}
                    </span>
                  </div>
                </div>

                {reporte.warnings.length > 0 && (
                  <ul className="space-y-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    {reporte.warnings.map((w) => (
                      <li key={w} className="flex gap-1.5">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}

                {reporte.errors.length > 0 && (
                  <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-destructive/40 px-3 py-2 text-xs">
                    {reporte.errors.map((e) => (
                      <li key={e} className="break-words text-destructive">{e}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {error && <p className="text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            {paso === "listo" ? (
              <>
                <Button variant="outline" onClick={reiniciar}>Importar otro</Button>
                <Button onClick={cerrar}>Cerrar</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={cerrar} disabled={ocupado}>Cancelar</Button>
                {paso === "revisado" ? (
                  <Button onClick={importar} disabled={filasValidas === 0}>
                    Importar {fmtInt(filasValidas)} {filasValidas === 1 ? "fila" : "filas"}
                  </Button>
                ) : paso === "importando" ? (
                  <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando…
                  </Button>
                ) : (
                  <Button onClick={revisar} disabled={!file || ocupado}>
                    {paso === "revisando" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Revisar archivo
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
