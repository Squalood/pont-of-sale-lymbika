"use client";

import { useEffect, useMemo, useState } from "react";
import { ServiceRateType } from "@/types/service";
import { patchServiceRate } from "@/api/patchServiceRate";
import { ForbiddenError } from "@/lib/auth";
import { toast } from "sonner";
import { impuestoLabel, servicePriceConImpuesto, SERVICE_IMPUESTO } from "@/lib/pricing";
import { normalize } from "@/lib/search";
import { urlImagen } from "@/lib/media";
import { strapiServiceRateUrl } from "@/lib/strapi-links";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, Loader2, SquarePen, Save, CircleX, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortField = "name" | "doctor" | "price" | "duration";
type SortDir = "asc" | "desc";

/** Mismo menú que la tabla de productos: cada campo nombra sus dos sentidos. */
const SORT_OPTIONS: {
  field: SortField;
  label: string;
  asc: string;
  desc: string;
}[] = [
  { field: "name", label: "Nombre", asc: "A → Z", desc: "Z → A" },
  { field: "doctor", label: "Doctor", asc: "A → Z", desc: "Z → A" },
  { field: "price", label: "Precio", asc: "Menor a mayor", desc: "Mayor a menor" },
  { field: "duration", label: "Duración", asc: "Más cortas", desc: "Más largas" },
];

const COLUMNS = 8;

function formatMoney(n: number): string {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Props = {
  services: ServiceRateType[];
  loading: boolean;
  error: string | null;
};

/**
 * Tarifas de consulta. Son pocas (~44) y llegan completas con
 * `useGetServiceRates`, así que búsqueda y orden se hacen aquí sin paginar.
 *
 * Solo el precio se edita, con el mismo patrón por fila que la tabla de
 * productos. Ojo: las mismas tarifas alimentan el sitio web, así que el cambio
 * se ve también ahí.
 */
export function ServicesTable({ services, loading, error }: Props) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState("");
  const [rowSaving, setRowSaving] = useState(false);

  // Copia local, para que una edición se vea sin volver a pedir las tarifas.
  const [list, setList] = useState<ServiceRateType[]>([]);

  useEffect(() => {
    setList(services);
  }, [services]);

  function startEdit(service: ServiceRateType) {
    setEditingRow(service.documentId);
    setDraftPrice(String(service.price));
  }

  function cancelEdit() {
    setEditingRow(null);
    setDraftPrice("");
  }

  async function saveEdit(service: ServiceRateType) {
    const name = service.medical_service?.name ?? "Consulta";
    const price = parseFloat(draftPrice);
    // `price` es requerido en Strapi: vacío o negativo no se manda.
    if (isNaN(price) || price < 0) {
      toast.error(`${name}: precio inválido`);
      return;
    }
    setRowSaving(true);
    try {
      await patchServiceRate(service.documentId, { price });
      setList((prev) =>
        prev.map((s) => (s.documentId === service.documentId ? { ...s, price } : s))
      );
      setEditingRow(null);
      setDraftPrice("");
      toast.success(`${name}: precio actualizado a $${price.toLocaleString("es-AR")}`);
    } catch (err) {
      // La fila sigue en edición, para corregir y reintentar sin volver a teclear.
      toast.error(
        err instanceof ForbiddenError
          ? `${name}: sin permiso para editar tarifas en Strapi`
          : `${name}: no se pudo guardar el precio`
      );
    } finally {
      setRowSaving(false);
    }
  }

  // Se normaliza una vez por carga, no en cada tecla (ver `normalize`).
  const indexed = useMemo(
    () =>
      list.map((s) => ({
        service: s,
        name: s.medical_service?.name ?? "",
        doctor: s.doctor?.doctorName ?? "",
        haystack: normalize(`${s.medical_service?.name ?? ""} ${s.doctor?.doctorName ?? ""}`),
      })),
    [list]
  );

  const rows = useMemo(() => {
    const term = normalize(search.trim());
    const filtered = term ? indexed.filter((r) => r.haystack.includes(term)) : indexed;
    const sign = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case "name":
          return sign * a.name.localeCompare(b.name, "es");
        case "doctor":
          return sign * a.doctor.localeCompare(b.doctor, "es");
        case "price":
          return sign * (a.service.price - b.service.price);
        case "duration":
          return sign * ((a.service.duration_min ?? 0) - (b.service.duration_min ?? 0));
      }
    });
  }, [indexed, search, sortField, sortDir]);

  const sort = SORT_OPTIONS.find((o) => o.field === sortField) ?? SORT_OPTIONS[0];
  const firstLoad = loading && list.length === 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Filtros */}
      <div className="shrink-0 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por consulta o doctor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 font-normal">
              <ArrowUpDown className="h-4 w-4" />
              {sort.label}
              <span className="text-muted-foreground">
                {sortDir === "asc" ? sort.asc : sort.desc}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortField}
              onValueChange={(v) => setSortField(v as SortField)}
            >
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.field} value={opt.field}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortDir}
              onValueChange={(v) => setSortDir(v as SortDir)}
            >
              <DropdownMenuRadioItem value="asc">{sort.asc}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">{sort.desc}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-sm text-muted-foreground">
          {rows.length} consulta{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <p className="shrink-0 text-sm text-destructive">
          Error al cargar consultas: {error}
        </p>
      )}

      {/* Tabla */}
      <div className="flex-1 min-h-0 overflow-auto rounded-md border">
        <Table className="[&_td]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Consulta</TableHead>
              <TableHead className="hidden md:table-cell">Doctor</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Duración</TableHead>
              <TableHead className="text-right" title="Tarifa sin impuesto. Es el valor que se guarda y el único editable.">
                Precio s/IVA
              </TableHead>
              <TableHead className="text-right" title="Lo que paga el cliente: tarifa más el IVA fijo de los servicios.">
                Precio final
              </TableHead>
              <TableHead className="text-center" title="Los servicios médicos siempre van a la misma tasa; no se captura por tarifa.">
                IVA
              </TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {firstLoad &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={COLUMNS}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!firstLoad && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS} className="text-center text-muted-foreground py-10">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}

            {rows.map(({ service, name, doctor }) => {
              const imgUrl = urlImagen(service.medical_service?.image?.url, 128) ?? null;
              const isEditing = editingRow === service.documentId;
              // Sigue al borrador mientras se edita, para ver el efecto antes de guardar.
              const base = isEditing ? parseFloat(draftPrice) : service.price;

              return (
                <TableRow key={service.documentId}>
                  {/* Imagen */}
                  <TableCell>
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrl}
                        alt={name}
                        width={36}
                        height={36}
                        className="rounded object-cover w-9 h-9"
                      />
                    ) : (
                      <span className="text-2xl">🩺</span>
                    )}
                  </TableCell>

                  {/* Consulta */}
                  <TableCell className="font-medium max-w-60">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate" title={name}>{name || "—"}</span>
                        <a
                          href={strapiServiceRateUrl(service.documentId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir tarifa en Strapi"
                          className="shrink-0 text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      {service.notes && (
                        <span className="text-xs text-muted-foreground truncate" title={service.notes}>
                          {service.notes}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Doctor */}
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-48">
                    <span className="block truncate" title={doctor || undefined}>{doctor || "—"}</span>
                  </TableCell>

                  {/* Duración */}
                  <TableCell className="hidden lg:table-cell text-right text-sm">
                    {service.duration_min > 0 ? `${service.duration_min} min` : "—"}
                  </TableCell>

                  {/* Precio */}
                  <TableCell className="text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={draftPrice}
                        onChange={(e) => setDraftPrice(e.target.value)}
                        className="h-7 w-24 text-right text-sm ml-auto"
                      />
                    ) : (
                      <span className="text-sm">${service.price.toLocaleString("es-AR")}</span>
                    )}
                  </TableCell>

                  {/* Precio final */}
                  <TableCell className="text-right">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {isNaN(base) ? "—" : formatMoney(servicePriceConImpuesto(base))}
                    </span>
                  </TableCell>

                  {/* IVA */}
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-normal">
                      {impuestoLabel(SERVICE_IMPUESTO)}
                    </Badge>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell>
                    <div className="flex items-center justify-baseline gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={rowSaving}
                            onClick={() => saveEdit(service)}
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            {rowSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={rowSaving}
                            onClick={cancelEdit}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <CircleX className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(service)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <SquarePen className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
