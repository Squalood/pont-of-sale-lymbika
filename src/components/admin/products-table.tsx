"use client";

import { useEffect, useState } from "react";
import { ProductType } from "@/types/product";
import { patchProduct } from "@/api/patchProduct";
import {
  useGetProductsPage,
  sortExcludesEmpty,
  type ProductsQuery,
  type SortField,
  type SortDir,
} from "@/api/getProductsPage";
import { useGetCategoryNames } from "@/api/getCategories";
import { IMPUESTO_OPTIONS, impuestoLabel, productImpuesto, type ImpuestoProducto } from "@/lib/pricing";
import { urlImagen } from "@/lib/media";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, SquarePen, Save, CircleX, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

/** Sin esperar, cada tecla del buscador dispara una consulta al catálogo. */
const SEARCH_DEBOUNCE_MS = 300;

/** Cada campo nombra sus dos sentidos: "A → Z" dice más que "ascendente". */
const SORT_OPTIONS: {
  field: SortField;
  label: string;
  asc: string;
  desc: string;
}[] = [
  { field: "productName", label: "Nombre", asc: "A → Z", desc: "Z → A" },
  { field: "price", label: "Precio", asc: "Menor a mayor", desc: "Mayor a menor" },
  { field: "stock_central", label: "Stock", asc: "Menor a mayor", desc: "Mayor a menor" },
  { field: "createdAt", label: "Fecha de alta", asc: "Más antiguos", desc: "Más recientes" },
];

const INITIAL_QUERY: ProductsQuery = {
  page: 1,
  pageSize: PAGE_SIZE_OPTIONS[0],
  search: "",
  category: "all",
  active: "all",
  // El orden que ya traía la tabla: lo último capturado primero.
  sortField: "createdAt",
  sortDir: "desc",
};

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

type RowDraft = {
  price: string;
  priceMember: string;
  stock_central: string;
  impuesto: ImpuestoProducto;
  active: boolean;
};

export function ProductsTable() {
  const [query, setQuery] = useState<ProductsQuery>(INITIAL_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [draft, setDraft] = useState<RowDraft | null>(null);
  const [rowSaving, setRowSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const { result, total, pageCount, loading, error } = useGetProductsPage(query);
  const categories = useGetCategoryNames();

  // Copia local de la página, para que una edición se vea sin volver a pedirla.
  const [products, setProducts] = useState<ProductType[]>([]);

  useEffect(() => {
    if (searchInput === query.search) return;
    const timer = setTimeout(() => {
      setQuery((q) => ({ ...q, search: searchInput, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, query.search]);

  useEffect(() => {
    // Llegó otra página: la fila que se estaba editando ya no está en pantalla.
    setProducts(result);
    setEditingRow(null);
    setDraft(null);
    setRowError(null);
  }, [result]);

  useEffect(() => {
    // El filtro pudo dejar menos páginas de las que había al pulsar el número.
    if (!loading && query.page > pageCount) {
      setQuery((q) => ({ ...q, page: pageCount }));
    }
  }, [loading, pageCount, query.page]);

  function applyFilter(patch: Partial<ProductsQuery>) {
    setQuery((q) => ({ ...q, ...patch, page: 1 }));
  }

  function goToPage(n: number) {
    setQuery((q) => ({ ...q, page: Math.min(Math.max(1, n), pageCount) }));
  }

  function updateLocal(documentId: string, fields: Partial<ProductType>) {
    setProducts((prev) =>
      prev.map((p) => (p.documentId === documentId ? { ...p, ...fields } : p))
    );
  }

  function startEdit(product: ProductType) {
    setEditingRow(product.documentId);
    setDraft({
      price: product.price != null ? String(product.price) : "",
      priceMember: product.priceMember != null ? String(product.priceMember) : "",
      stock_central: product.stock_central != null ? String(product.stock_central) : "",
      // Un producto sin el campo capturado arranca en iva0, igual que lo interpreta el POS.
      impuesto: productImpuesto(product),
      active: product.active,
    });
    setRowError(null);
  }

  function cancelEdit() {
    setEditingRow(null);
    setDraft(null);
    setRowError(null);
  }

  async function saveEdit(product: ProductType) {
    if (!draft) return;
    setRowSaving(true);
    setRowError(null);

    const fields: {
      price?: number;
      priceMember?: number;
      stock_central?: number;
      impuesto?: ImpuestoProducto;
      active?: boolean;
    } = {};
    const newPrice = parseFloat(draft.price);
    const newPriceMember = parseFloat(draft.priceMember);
    const newStock = parseFloat(draft.stock_central);

    if (!isNaN(newPrice)) fields.price = newPrice;
    if (!isNaN(newPriceMember)) fields.priceMember = newPriceMember;
    if (!isNaN(newStock)) fields.stock_central = newStock;
    fields.impuesto = draft.impuesto;
    fields.active = draft.active;

    try {
      await patchProduct(product.documentId, fields);
      updateLocal(product.documentId, fields);
      setEditingRow(null);
      setDraft(null);
    } catch {
      setRowError("Error al guardar");
    } finally {
      setRowSaving(false);
    }
  }

  const sort = SORT_OPTIONS.find((o) => o.field === query.sortField) ?? SORT_OPTIONS[0];
  const firstLoad = loading && products.length === 0;
  const from = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const to = Math.min(query.page * query.pageSize, total);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Filtros */}
      <div className="shrink-0 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por nombre o sustancia activa..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />
        <Select value={query.category} onValueChange={(v) => applyFilter({ category: v })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={query.active}
          onValueChange={(v) => applyFilter({ active: v as ProductsQuery["active"] })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 font-normal">
              <ArrowUpDown className="h-4 w-4" />
              {sort.label}
              <span className="text-muted-foreground">
                {query.sortDir === "asc" ? sort.asc : sort.desc}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={query.sortField}
              onValueChange={(v) => applyFilter({ sortField: v as SortField })}
            >
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.field} value={opt.field}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            {/* Los sentidos se nombran según el campo elegido. */}
            <DropdownMenuRadioGroup
              value={query.sortDir}
              onValueChange={(v) => applyFilter({ sortDir: v as SortDir })}
            >
              <DropdownMenuRadioItem value="asc">{sort.asc}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">{sort.desc}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            `${total.toLocaleString("es-AR")} producto${total !== 1 ? "s" : ""}`
          )}
        </span>

        {sortExcludesEmpty(query.sortField) && (
          <span className="text-xs text-muted-foreground">
            (los productos sin {sort.label.toLowerCase()} quedan fuera de este orden)
          </span>
        )}
      </div>

      {error && (
        <p className="shrink-0 text-sm text-destructive">
          Error al cargar productos: {error}
        </p>
      )}

      {/* Tabla */}
      <div className="flex-1 min-h-0 overflow-auto rounded-md border">
        <Table className="[&_td]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Sustancia</TableHead>
              <TableHead className="hidden lg:table-cell text-center">Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Health Pass</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">IVA</TableHead>
              <TableHead className="text-center">Activo</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={loading && !firstLoad ? "opacity-50" : undefined}>
            {firstLoad &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={10}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!firstLoad && products.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}

            {products.map((product) => {
              // 36 px en pantalla: se pide la variante más pequeña.
              const imgUrl = urlImagen(product.images?.[0]?.url, 128) ?? null;
              const isEditing = editingRow === product.documentId;

              return (
                <TableRow key={product.documentId} className={!product.active ? "opacity-50" : undefined}>
                  {/* Imagen */}
                  <TableCell>
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrl}
                        alt={product.productName}
                        width={36}
                        height={36}
                        className="rounded object-cover w-9 h-9"
                      />
                    ) : (
                      <span className="text-2xl">💊</span>
                    )}
                  </TableCell>

                  {/* Nombre */}
                  <TableCell className="font-medium max-w-50">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="truncate" title={product.productName}>{product.productName}</span>
                      {product.sku && (
                        <span className="text-xs text-muted-foreground">{product.sku}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Sustancia activa */}
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-40">
                    <span className="block truncate" title={product.sal || undefined}>{product.sal || "—"}</span>
                  </TableCell>

                  {/* Categoría */}
                  <TableCell className="hidden lg:table-cell text-center">
                    {product.category?.categoryName ? (
                      <Badge variant="secondary">{product.category.categoryName}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Precio */}
                  <TableCell className="text-right">
                    {isEditing && draft ? (
                      <Input
                        type="number"
                        value={draft.price}
                        onChange={(e) => setDraft((d) => d ? { ...d, price: e.target.value } : d)}
                        className="h-7 w-24 text-right text-sm ml-auto"
                      />
                    ) : (
                      <span className="text-sm">
                        {product.price != null ? `$${product.price.toLocaleString("es-AR")}` : "—"}
                      </span>
                    )}
                  </TableCell>

                  {/* Precio Health Pass */}
                  <TableCell className="text-right">
                    {isEditing && draft ? (
                      <Input
                        type="number"
                        value={draft.priceMember}
                        onChange={(e) => setDraft((d) => d ? { ...d, priceMember: e.target.value } : d)}
                        className="h-7 w-24 text-right text-sm ml-auto"
                      />
                    ) : (
                      <span className="text-sm">
                        {product.priceMember != null ? `$${product.priceMember.toLocaleString("es-AR")}` : "—"}
                      </span>
                    )}
                  </TableCell>

                  {/* Stock */}
                  <TableCell className="text-right">
                    {isEditing && draft ? (
                      <Input
                        type="number"
                        value={draft.stock_central}
                        onChange={(e) => setDraft((d) => d ? { ...d, stock_central: e.target.value } : d)}
                        className="h-7 w-20 text-right text-sm ml-auto"
                      />
                    ) : (
                      <span className="text-sm">
                        {product.stock_central != null ? product.stock_central.toLocaleString("es-AR") : "—"}
                      </span>
                    )}
                  </TableCell>

                  {/* IVA incluido en el precio */}
                  <TableCell className="text-center">
                    {isEditing && draft ? (
                      <Select
                        value={draft.impuesto}
                        onValueChange={(v) =>
                          setDraft((d) => d ? { ...d, impuesto: v as ImpuestoProducto } : d)
                        }
                      >
                        <SelectTrigger size="sm" className="mx-auto h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IMPUESTO_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt} className="text-xs">
                              {impuestoLabel(opt)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : product.impuesto == null ? (
                      // Sin capturar: el POS lo cobra sin IVA, así que conviene que resalte.
                      <Badge variant="outline" className="border-amber-300 text-amber-600 font-normal">
                        Sin capturar
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">
                        {impuestoLabel(productImpuesto(product))}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Activo */}
                  <TableCell className="text-center">
                    {isEditing && draft ? (
                      <Switch
                        checked={draft.active}
                        onCheckedChange={(val) => setDraft((d) => d ? { ...d, active: val } : d)}
                      />
                    ) : (
                      <Badge variant={product.active ? "default" : "secondary"}>
                        {product.active ? "Activo" : "Inactivo"}
                      </Badge>
                    )}
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
                            onClick={() => saveEdit(product)}
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
                          onClick={() => startEdit(product)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <SquarePen className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {isEditing && rowError && (
                      <p className="text-xs text-destructive text-right mt-1">{rowError}</p>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {total === 0
            ? "Sin productos"
            : `Mostrando ${from.toLocaleString("es-AR")}–${to.toLocaleString("es-AR")} de ${total.toLocaleString("es-AR")}`}
        </span>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Filas por página
            </span>
            <Select
              value={String(query.pageSize)}
              onValueChange={(v) => applyFilter({ pageSize: Number(v) })}
            >
              <SelectTrigger size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Pág. {query.page} / {pageCount}
          </span>

          <Pagination className="w-auto mx-0">
            <PaginationContent className="gap-0">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); goToPage(query.page - 1); }}
                  aria-disabled={query.page === 1}
                  className={query.page === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              {getPageNumbers(query.page, pageCount).map((n, i) =>
                n === "…" ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={n}>
                    <PaginationLink
                      href="#"
                      isActive={n === query.page}
                      onClick={(e) => { e.preventDefault(); goToPage(n); }}
                    >
                      {n}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); goToPage(query.page + 1); }}
                  aria-disabled={query.page === pageCount}
                  className={query.page === pageCount ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
