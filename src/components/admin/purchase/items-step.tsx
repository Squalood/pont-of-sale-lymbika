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
  onRemoveItem: (idx: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ItemsStep({
  products,
  items,
  onAddProduct,
  onChangeQty,
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
          (p.sal ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, search]);

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
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-lg border px-3 py-2 space-y-1.5">
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
                <div className="flex items-center gap-2">
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
                  {/* TODO: restaurar costo unitario y total cuando se habiliten costos */}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* TODO: restaurar total general cuando se habiliten costos */}
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
