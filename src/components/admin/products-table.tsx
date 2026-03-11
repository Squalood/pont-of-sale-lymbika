"use client";

import { useState, useMemo } from "react";
import { ProductType } from "@/types/product";
import { patchProduct } from "@/api/patchProduct";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, SquarePen, Save, CircleX } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
const PAGE_SIZE = 20;

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

function resolveImageUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url}`;
}

type RowDraft = {
  price: string;
  priceMember: string;
  stock_central: string;
  active: boolean;
};

interface ProductsTableProps {
  initialProducts: ProductType[];
}

export function ProductsTable({ initialProducts }: ProductsTableProps) {
  const [products, setProducts] = useState<ProductType[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [draft, setDraft] = useState<RowDraft | null>(null);
  const [rowSaving, setRowSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of initialProducts) {
      if (p.category?.categoryName) {
        seen.set(p.category.categoryName, p.category.categoryName);
      }
    }
    return Array.from(seen.values()).sort();
  }, [initialProducts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.productName.toLowerCase().includes(q) ||
        (p.sal ?? "").toLowerCase().includes(q);
      const matchCategory =
        categoryFilter === "all" ||
        p.category?.categoryName === categoryFilter;
      const matchActive =
        activeFilter === "all" ||
        (activeFilter === "active" ? p.active : !p.active);
      return matchSearch && matchCategory && matchActive;
    });
  }, [products, search, categoryFilter, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(val: string) { setSearch(val); setPage(1); }
  function handleCategoryFilter(val: string) { setCategoryFilter(val); setPage(1); }
  function handleActiveFilter(val: string) { setActiveFilter(val); setPage(1); }

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

    const fields: { price?: number; priceMember?: number; stock_central?: number; active?: boolean } = {};
    const newPrice = parseFloat(draft.price);
    const newPriceMember = parseFloat(draft.priceMember);
    const newStock = parseFloat(draft.stock_central);

    if (!isNaN(newPrice)) fields.price = newPrice;
    if (!isNaN(newPriceMember)) fields.priceMember = newPriceMember;
    if (!isNaN(newStock)) fields.stock_central = newStock;
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

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Filtros + paginación */}
      <div className="shrink-0 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por nombre o sustancia activa..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
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
        <Select value={activeFilter} onValueChange={handleActiveFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
        </span>

        {totalPages > 1 && (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Pág. {page} / {totalPages}
            </span>
            <Pagination className="w-auto mx-0">
              <PaginationContent className="gap-0">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                    aria-disabled={page === 1}
                    className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                {getPageNumbers(page, totalPages).map((n, i) =>
                  n === "…" ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={n}>
                      <PaginationLink
                        href="#"
                        isActive={n === page}
                        onClick={(e) => { e.preventDefault(); setPage(n); }}
                      >
                        {n}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                    aria-disabled={page === totalPages}
                    className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

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
              <TableHead className="text-right">MediClub</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">Activo</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
            {paginated.map((product) => {
              const imgUrl = product.images?.[0]?.url
                ? resolveImageUrl(product.images[0].url)
                : null;
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

                  {/* Precio MediClub */}
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
    </div>
  );
}
