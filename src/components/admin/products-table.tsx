"use client";

import { useState, useMemo, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
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

type SavingKey = string; // `${documentId}-${field}`

interface EditableNumberCellProps {
  documentId: string;
  field: "price" | "priceMember" | "stock_central";
  value: number | null;
  isSaving: boolean;
  onSave: (val: number) => Promise<void>;
  format?: "currency" | "integer";
}

function EditableNumberCell({
  value,
  isSaving,
  onSave,
  format = "currency",
}: EditableNumberCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value !== null ? String(value) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commit() {
    setEditing(false);
    const num = parseFloat(draft);
    if (isNaN(num) || num === value) return;
    await onSave(num);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  const displayValue =
    value === null
      ? "—"
      : format === "currency"
      ? `$${value.toLocaleString("es-AR")}`
      : value.toLocaleString("es-AR");

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="h-7 w-24 text-right text-sm"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      disabled={isSaving}
      className="group flex items-center gap-1.5 rounded px-1 py-0.5 text-right text-sm hover:bg-muted disabled:opacity-50"
    >
      {isSaving ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : null}
      <span className="group-hover:underline group-hover:underline-offset-2">
        {displayValue}
      </span>
    </button>
  );
}

interface ProductsTableProps {
  initialProducts: ProductType[];
}

export function ProductsTable({ initialProducts }: ProductsTableProps) {
  const [products, setProducts] = useState<ProductType[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [savings, setSavings] = useState<Record<SavingKey, boolean>>({});
  const [errors, setErrors] = useState<Record<SavingKey, string>>({});

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

  function setSaving(key: SavingKey, val: boolean) {
    setSavings((prev) => ({ ...prev, [key]: val }));
  }

  function setError(key: SavingKey, msg: string) {
    setErrors((prev) => ({ ...prev, [key]: msg }));
    setTimeout(() => setErrors((prev) => ({ ...prev, [key]: "" })), 3000);
  }

  function updateLocal(documentId: string, fields: Partial<ProductType>) {
    setProducts((prev) =>
      prev.map((p) => (p.documentId === documentId ? { ...p, ...fields } : p))
    );
  }

  async function handleSaveField(
    documentId: string,
    field: "price" | "priceMember" | "stock_central",
    newValue: number,
    previousValue: number | null
  ) {
    const key: SavingKey = `${documentId}-${field}`;
    setSaving(key, true);
    updateLocal(documentId, { [field]: newValue });
    try {
      await patchProduct(documentId, { [field]: newValue });
    } catch {
      updateLocal(documentId, { [field]: previousValue ?? undefined });
      setError(key, "Error al guardar");
    } finally {
      setSaving(key, false);
    }
  }

  async function handleToggleActive(documentId: string, currentActive: boolean) {
    const key: SavingKey = `${documentId}-active`;
    setSaving(key, true);
    updateLocal(documentId, { active: !currentActive });
    try {
      await patchProduct(documentId, { active: !currentActive });
    } catch {
      updateLocal(documentId, { active: currentActive });
      setError(key, "Error al guardar");
    } finally {
      setSaving(key, false);
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Sustancia</TableHead>
              <TableHead className="hidden lg:table-cell">Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">MediClub</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
            {paginated.map((product) => {
              const imgUrl = product.images?.[0]?.url
                ? resolveImageUrl(product.images[0].url)
                : null;
              const activeSaving = savings[`${product.documentId}-active`];
              const activeError = errors[`${product.documentId}-active`];

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
                        <span className="text-xs text-muted-foreground">
                          {product.sku}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Sustancia activa */}
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-40">
                    <span className="block truncate" title={product.sal || undefined}>{product.sal || "—"}</span>
                  </TableCell>

                  {/* Categoría */}
                  <TableCell className="hidden lg:table-cell">
                    {product.category?.categoryName ? (
                      <Badge variant="secondary">{product.category.categoryName}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Precio */}
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <EditableNumberCell
                        documentId={product.documentId}
                        field="price"
                        value={product.price}
                        isSaving={!!savings[`${product.documentId}-price`]}
                        onSave={(val) =>
                          handleSaveField(product.documentId, "price", val, product.price)
                        }
                        format="currency"
                      />
                    </div>
                    {errors[`${product.documentId}-price`] && (
                      <p className="text-xs text-destructive">{errors[`${product.documentId}-price`]}</p>
                    )}
                  </TableCell>

                  {/* Precio MediClub */}
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <EditableNumberCell
                        documentId={product.documentId}
                        field="priceMember"
                        value={product.priceMember}
                        isSaving={!!savings[`${product.documentId}-priceMember`]}
                        onSave={(val) =>
                          handleSaveField(product.documentId, "priceMember", val, product.priceMember)
                        }
                        format="currency"
                      />
                    </div>
                    {errors[`${product.documentId}-priceMember`] && (
                      <p className="text-xs text-destructive">{errors[`${product.documentId}-priceMember`]}</p>
                    )}
                  </TableCell>

                  {/* Stock */}
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <EditableNumberCell
                        documentId={product.documentId}
                        field="stock_central"
                        value={product.stock_central}
                        isSaving={!!savings[`${product.documentId}-stock_central`]}
                        onSave={(val) =>
                          handleSaveField(product.documentId, "stock_central", val, product.stock_central)
                        }
                        format="integer"
                      />
                    </div>
                    {errors[`${product.documentId}-stock_central`] && (
                      <p className="text-xs text-destructive">{errors[`${product.documentId}-stock_central`]}</p>
                    )}
                  </TableCell>

                  {/* Activo */}
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={product.active}
                        disabled={activeSaving}
                        onCheckedChange={() =>
                          handleToggleActive(product.documentId, product.active)
                        }
                      />
                      {activeSaving && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                      {activeError && (
                        <p className="text-xs text-destructive">{activeError}</p>
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
