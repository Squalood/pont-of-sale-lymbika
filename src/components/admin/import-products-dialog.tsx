"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, Upload } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ForbiddenError } from "@/lib/auth";
import { fmtInt } from "@/lib/format";
import { importProductsCsv, type ImportResult } from "@/api/productsCsv";

type Paso = "elegir" | "revisando" | "revisado" | "importando" | "listo";

function Opcion({
  checked,
  disabled,
  onChange,
  titulo,
  detalle,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  titulo: string;
  detalle: string;
}) {
  return (
    <label className="flex items-start gap-2 text-xs">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
      />
      <span>
        {titulo}
        <span className="block text-muted-foreground">{detalle}</span>
      </span>
    </label>
  );
}

/**
 * Importar productos desde un CSV: un archivo (normalmente el de "Exportar CSV", editado en
 * Excel) o texto pegado (la respuesta de ChatGPT/Claude al "prompt de ficha" de un producto).
 * Siempre en dos pasos: primero el backend revisa sin guardar nada (`dryRun`) y se muestra
 * qué va a cambiar y qué filas tienen errores; solo después se importa de verdad. Una fila con
 * errores se salta entera, así que importar con errores es seguro.
 */
export function ImportProductsButton({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pegado, setPegado] = useState("");
  // Activado por defecto: al dar de alta productos nuevos casi siempre falta alguna
  // sustancia o indicación. La revisión muestra cuáles se crearían, así un error de dedo
  // se ve antes de confirmar.
  const [crearFaltantes, setCrearFaltantes] = useState(true);
  // Candados del alta 1×1 con IA, activos por defecto: si ChatGPT/Claude llena una celda que
  // ya estaba capturada (o pierde el documentId), no se pisa la ficha ni se duplica el
  // producto. Para editar precios u otros datos en bloque desde Excel hay que quitar
  // "solo campos vacíos"; la revisión avisa cuántas celdas se respetaron.
  const [soloVacios, setSoloVacios] = useState(true);
  const [crearProductos, setCrearProductos] = useState(false);
  const [paso, setPaso] = useState<Paso>("elegir");
  const [revision, setRevision] = useState<ImportResult | null>(null);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ocupado = paso === "revisando" || paso === "importando";
  const reporte = resultado ?? revision;
  const filasValidas = revision ? revision.updated + revision.created : 0;
  const origen: File | string | null = file ?? (pegado.trim() ? pegado : null);
  const nuevos = reporte?.newCatalogEntries;
  const hayNuevos = !!nuevos && nuevos.principiosActivos.length + nuevos.indicaciones.length > 0;
  const opciones = { crearFaltantes, soloVacios, crearProductos };

  function olvidarRevision() {
    setPaso("elegir");
    setRevision(null);
    setResultado(null);
    setError(null);
  }

  function reiniciar() {
    setFile(null);
    setPegado("");
    setSoloVacios(true);
    setCrearProductos(false);
    olvidarRevision();
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
        : `No se pudo ${accion} el CSV`;
  }

  async function revisar() {
    if (!origen) return;
    setPaso("revisando");
    setError(null);
    try {
      setRevision(await importProductsCsv(origen, { dryRun: true, ...opciones }));
      setPaso("revisado");
    } catch (err) {
      setError(mensajeDeError(err, "revisar"));
      setPaso("elegir");
    }
  }

  async function importar() {
    if (!origen) return;
    setPaso("importando");
    setError(null);
    try {
      const r = await importProductsCsv(origen, { dryRun: false, ...opciones });
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
      // una es independiente). Volver a importar el mismo CSV es seguro.
      setError(
        `${mensajeDeError(err, "importar")}. Puede que una parte sí se haya guardado; ` +
          "puedes volver a importar el mismo CSV sin riesgo."
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
              Solo cambia las columnas que traiga el CSV: una celda vacía no cambia nada y un
              guion (-) borra el valor. El stock no se importa. Primero se revisa sin guardar nada.
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
                setPegado("");
                olvidarRevision();
              }}
            />

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                …o pega aquí el CSV que te dio ChatGPT o Claude con el prompt de ficha:
              </p>
              <Textarea
                value={pegado}
                disabled={ocupado || paso === "listo"}
                placeholder={"documentId,tipoProducto,composicion,…\nabc123,medicamento,Loratadina 10 mg,…"}
                className="h-24 font-mono text-xs"
                onChange={(e) => {
                  setPegado(e.target.value);
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                  olvidarRevision();
                }}
              />
            </div>

            <div className="space-y-3">
              <Opcion
                checked={soloVacios}
                disabled={ocupado || paso === "listo"}
                onChange={(v) => {
                  setSoloVacios(v);
                  olvidarRevision();
                }}
                titulo="Solo llenar campos vacíos"
                detalle="Lo que el producto ya tiene capturado no se cambia aunque el CSV traiga otra cosa. Quítalo solo para corregir datos a propósito (precios, una ficha mal llenada)."
              />
              <Opcion
                checked={crearFaltantes}
                disabled={ocupado || paso === "listo"}
                onChange={(v) => {
                  setCrearFaltantes(v);
                  olvidarRevision();
                }}
                titulo="Crear los principios activos e indicaciones que todavía no existan"
                detalle="Se crean solo con el nombre y quedan pendientes; su información clínica se llena después en Strapi."
              />
              <Opcion
                checked={crearProductos}
                disabled={ocupado || paso === "listo"}
                onChange={(v) => {
                  setCrearProductos(v);
                  olvidarRevision();
                }}
                titulo="Crear productos nuevos (filas sin documentId)"
                detalle="Apagado, una fila sin documentId se marca como error: así no se duplica un producto si la IA lo omitió."
              />
            </div>

            {ocupado && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {paso === "revisando"
                  ? "Revisando el CSV…"
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

                {hayNuevos && nuevos && (
                  <div className="space-y-1 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="h-3 w-3" />
                      {paso === "listo" ? "Se crearon" : "Se crearán (revisa que estén bien escritos)"}
                    </p>
                    {nuevos.principiosActivos.length > 0 && (
                      <p>Principios activos: {nuevos.principiosActivos.join(", ")}</p>
                    )}
                    {nuevos.indicaciones.length > 0 && <p>Indicaciones: {nuevos.indicaciones.join(", ")}</p>}
                  </div>
                )}

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
                  <Button onClick={revisar} disabled={!origen || ocupado}>
                    {paso === "revisando" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Revisar
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
