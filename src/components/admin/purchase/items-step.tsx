"use client";

import { useState } from "react";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { ProductType } from "@/types/product";
import { useSearchProducts } from "@/api/searchProducts";
import { LocalPurchaseItem } from "./types";
import { itemQuantity, itemTotalLine, comprasTotal } from "./helpers";

interface ItemsStepProps {
  items: LocalPurchaseItem[];
  onAddProduct: (product: ProductType) => void;
  onChangeCosto: (idx: number, value: string) => void;
  onChangeIva: (idx: number, value: "iva8" | "iva16" | "exento") => void;
  onAddLote: (idx: number) => void;
  onRemoveLote: (itemIdx: number, loteIdx: number) => void;
  onChangeLoteNumero: (itemIdx: number, loteIdx: number, value: string) => void;
  onChangeLoteCantidad: (itemIdx: number, loteIdx: number, value: string) => void;
  onChangeLoteCaducidad: (itemIdx: number, loteIdx: number, value: string) => void;
  onRemoveItem: (idx: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2 });

const IVA_OPTIONS = [
  { value: "exento", label: "Ex" },
  { value: "iva8", label: "8%" },
  { value: "iva16", label: "16%" },
] as const;

export function ItemsStep({
  items,
  onAddProduct,
  onChangeCosto,
  onChangeIva,
  onAddLote,
  onRemoveLote,
  onChangeLoteNumero,
  onChangeLoteCantidad,
  onChangeLoteCaducidad,
  onRemoveItem,
  onNext,
  onBack,
}: ItemsStepProps) {
  const [search, setSearch] = useState("");
  const { results: searchResults, loading: searching } = useSearchProducts(search);

  const total = comprasTotal(items);

  function handleAdd(product: ProductType) {
    setSearch("");
    onAddProduct(product);
  }

  return (
    <>
      <div className="min-w-0 space-y-3">
        <div className="relative">
          <Input
            placeholder="Buscar producto por nombre o sal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search.trim() && (
            <div className="absolute z-10 left-0 right-0 top-full mt-1 rounded-lg border bg-background shadow-md max-h-48 overflow-y-auto">
              {/* Los resultados anteriores siguen a la vista mientras llega la
                  siguiente búsqueda: así el desplegable no parpadea al teclear. */}
              {searchResults.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  {searching ? "Buscando…" : "Sin resultados"}
                </p>
              )}
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full min-w-0 px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between gap-2"
                  onClick={() => handleAdd(p)}
                >
                  <span className="min-w-0 flex-1 truncate">{p.productName}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Stock: {p.stock_central}
                  </span>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            Busca y agrega productos a esta compra
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-lg border px-3 py-2 space-y-2">
                {/* Nombre + total + eliminar */}
                <div className="flex items-center gap-2 min-w-0">
                  <p
                    title={item.productName}
                    className="min-w-0 flex-1 truncate text-sm font-medium"
                  >
                    {item.productName}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    x{itemQuantity(item)}
                    {item.costoUnitario > 0 && ` · $${fmt(itemTotalLine(item))}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(idx)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Precio + IVA (por producto) */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Precio</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.costoUnitario === 0 ? "" : item.costoUnitario}
                      onChange={(e) => onChangeCosto(idx, e.target.value)}
                      placeholder="0.00"
                      className="h-7 w-24 text-center text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">IVA</span>
                    <div className="flex rounded border overflow-hidden text-xs">
                      {IVA_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => onChangeIva(idx, opt.value)}
                          className={`px-2 py-0.5 border-r last:border-r-0 ${
                            (item.iva ?? "exento") === opt.value
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lotes (renglones) */}
                <div className="space-y-1.5 border-t pt-2">
                  {item.lotes.map((lote, li) => (
                    <div key={li} className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Cant</span>
                        <Input
                          type="number"
                          min={1}
                          value={lote.cantidad}
                          onChange={(e) => onChangeLoteCantidad(idx, li, e.target.value)}
                          className="h-7 w-14 text-center text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Lote</span>
                        <Input
                          value={lote.numeroLote}
                          onChange={(e) => onChangeLoteNumero(idx, li, e.target.value)}
                          placeholder="Nº lote"
                          className="h-7 w-24 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Caduca</span>
                        <Input
                          type="date"
                          value={lote.fechaCaducidad ?? ""}
                          onChange={(e) => onChangeLoteCaducidad(idx, li, e.target.value)}
                          className="h-7 w-36 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveLote(idx, li)}
                        title="Quitar lote"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => onAddLote(idx)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar lote
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 0 && (
          <div className="flex justify-end border-t pt-2">
            <span className="text-sm font-semibold">Total: ${fmt(total)}</span>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack}>Atrás</Button>
        <Button onClick={onNext} disabled={items.length === 0}>
          Siguiente
        </Button>
      </DialogFooter>
    </>
  );
}
