"use client";

import { useState, useMemo } from "react";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { ProductType } from "@/types/product";
import { LocalItem } from "./types";

interface ItemsStepProps {
  products: ProductType[];
  items: LocalItem[];
  onAddProduct: (product: ProductType) => void;
  onChangeQty: (idx: number, value: string) => void;
  onChangeCosto: (idx: number, value: string) => void;
  onChangeLote: (idx: number, value: string) => void;
  onChangeCaducidad: (idx: number, value: string) => void;
  onChangeIva: (idx: number, value: "iva8" | "iva16" | "exento") => void;
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
  products,
  items,
  onAddProduct,
  onChangeQty,
  onChangeCosto,
  onChangeLote,
  onChangeCaducidad,
  onChangeIva,
  onRemoveItem,
  onNext,
  onBack,
}: ItemsStepProps) {
  const [search, setSearch] = useState("");

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products
      .filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          (p.sal ?? "").toLowerCase().includes(q) ||
          (p.barCode ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, search]);

  const total = items.reduce((sum, i) => sum + i.totalLine, 0);

  function handleAdd(product: ProductType) {
    setSearch("");
    onAddProduct(product);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="relative">
          <Input
            placeholder="Buscar producto por nombre o sal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 left-0 right-0 top-full mt-1 rounded-lg border bg-background shadow-md max-h-48 overflow-y-auto">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full min-w-0 px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between gap-2"
                  onClick={() => handleAdd(p)}
                >
                  <span className="flex-1 truncate">{p.productName}</span>
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
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-lg border px-3 py-2 space-y-1.5">
                {/* Nombre + eliminar */}
                <div className="flex items-center gap-2 min-w-0">
                  <p className="flex-1 truncate text-sm font-medium">{item.productName}</p>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(idx)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {/* Cant + Precio + IVA */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Cant</span>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => onChangeQty(idx, e.target.value)}
                      className="h-7 w-16 text-center text-sm"
                    />
                  </div>
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
                  {item.costoUnitario > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      ${fmt(item.totalLine)}
                    </span>
                  )}
                </div>
                {/* Lote + Caducidad */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Lote</span>
                    <Input
                      value={item.numeroLote ?? ""}
                      onChange={(e) => onChangeLote(idx, e.target.value)}
                      placeholder="Nº lote"
                      className="h-7 w-28 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Caduca</span>
                    <Input
                      type="date"
                      value={item.fechaCaducidad ?? ""}
                      onChange={(e) => onChangeCaducidad(idx, e.target.value)}
                      className="h-7 w-36 text-sm"
                    />
                  </div>
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
