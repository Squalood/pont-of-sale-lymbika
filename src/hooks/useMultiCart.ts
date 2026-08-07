import { useState } from "react";
import { toast } from "sonner";
import { Cart, CartItem, ProductType, cartItemKey } from "@/types/product";
import type { ImpuestoLinea, PriceMode } from "@/lib/pricing";

export const CART_VW = 25;
export const MAX_CARTS = 4;

// Tope de cantidad de una línea = currentAmount del lote elegido (snapshot del producto en el
// carrito). Una línea = un lote, así que no se puede vender más de lo que hay en ese lote.
// Línea sin lote (producto aún sin lotear) → sin tope por lote (se limita solo por stock real).
function lotCap(item: CartItem): number {
  if (item.type !== "product" || !item.selectedLot) return Infinity;
  const selected = item.selectedLot;
  const lot = item.product.inventory_lots?.find((l) => l.documentId === selected.documentId);
  return lot?.currentAmount ?? Infinity;
}

export function useMultiCart(
  setProducts: React.Dispatch<React.SetStateAction<ProductType[]>>
) {
  const [carts, setCarts] = useState<Cart[]>([{ id: 1, items: [], priceMode: "regular" }]);
  const [nextCartId, setNextCartId] = useState(2);
  const [activeCartId, setActiveCartId] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sidebarWidth = `${100 - carts.length * CART_VW}vw`;

  function addToCartOf(cartId: number, item: CartItem) {
    setCarts((prev) =>
      prev.map((cart) => {
        if (cart.id !== cartId) return cart;
        const key = cartItemKey(item);
        const existing = cart.items.find((i) => cartItemKey(i) === key);
        if (existing) {
          const cap = lotCap(existing);
          const newQty = Math.min(existing.quantity + item.quantity, cap);
          return { ...cart, items: cart.items.map((i) => cartItemKey(i) === key ? { ...i, quantity: newQty } : i) };
        }
        return { ...cart, items: [...cart.items, { ...item, quantity: Math.min(item.quantity, lotCap(item)) }] };
      })
    );
  }

  function updateQuantityOf(cartId: number, itemKey: string, delta: number) {
    setCarts((prev) =>
      prev.map((cart) => {
        if (cart.id !== cartId) return cart;
        return {
          ...cart,
          items: cart.items
            .map((item) => cartItemKey(item) === itemKey ? { ...item, quantity: Math.min(item.quantity + delta, lotCap(item)) } : item)
            .filter((item) => item.quantity > 0),
        };
      })
    );
  }

  function removeItemOf(cartId: number, itemKey: string) {
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id !== cartId ? cart : { ...cart, items: cart.items.filter((i) => cartItemKey(i) !== itemKey) }
      )
    );
  }

  function updateItemPriceOf(cartId: number, itemKey: string, newPrice: number | undefined) {
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id !== cartId ? cart : {
          ...cart,
          items: cart.items.map((item) => cartItemKey(item) === itemKey ? { ...item, overridePrice: newPrice } : item),
        }
      )
    );
  }

  // Corrige el impuesto de una línea solo para esta venta (hay productos con el campo sin
  // actualizar). `undefined` restaura el del producto. Solo aplica a líneas de producto:
  // los servicios son exentos y no se editan, por eso hay que estrechar el union.
  function updateItemImpuestoOf(cartId: number, itemKey: string, impuesto: ImpuestoLinea | undefined) {
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id !== cartId ? cart : {
          ...cart,
          items: cart.items.map((item) =>
            item.type === "product" && cartItemKey(item) === itemKey
              ? { ...item, overrideImpuesto: impuesto }
              : item
          ),
        }
      )
    );
  }

  function clearCartOf(cartId: number) {
    setCarts((prev) =>
      prev.map((cart) => cart.id !== cartId ? cart : { ...cart, items: [] })
    );
  }

  // Un switch en `on` define la tarifa; apagarlo vuelve a mostrador. Al encender uno el
  // otro queda apagado solo, porque el carrito guarda una tarifa y no dos banderas.
  function setPriceModeOf(cartId: number, mode: PriceMode) {
    setCarts((prev) =>
      prev.map((cart) => cart.id !== cartId ? cart : { ...cart, priceMode: mode })
    );
  }

  function addCart() {
    if (carts.length >= MAX_CARTS) return;
    const id = nextCartId;
    setCarts((prev) => [...prev, { id, items: [], priceMode: "regular" }]);
    setNextCartId(id + 1);
    setActiveCartId(id);
    if (carts.length + 1 === MAX_CARTS) setSidebarOpen(false);
  }

  function removeCart(id: number) {
    if (carts.length <= 1) return;
    setCarts((prev) => prev.filter((c) => c.id !== id));
    if (activeCartId === id) {
      const remaining = carts.filter((c) => c.id !== id);
      setActiveCartId(remaining[remaining.length - 1].id);
    }
  }

  function handleSaleComplete(cartId: number, soldItems: CartItem[]) {
    // [A3] Un producto puede aparecer en varias líneas (varios lotes). Agregamos por producto para
    // restar stock_central una sola vez, y decrementamos el currentAmount de cada lote vendido.
    const productLines = soldItems.filter(
      (i): i is Extract<CartItem, { type: "product" }> => i.type === "product"
    );
    setProducts((prev) =>
      prev.map((p) => {
        const lines = productLines.filter((l) => l.product.id === p.id);
        if (lines.length === 0) return p;

        const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
        const soldPerLot = new Map<string, number>();
        lines.forEach((l) => {
          if (!l.selectedLot) return; // línea sin lote: solo afecta stock_central
          soldPerLot.set(l.selectedLot.documentId, (soldPerLot.get(l.selectedLot.documentId) ?? 0) + l.quantity);
        });

        const inventory_lots = p.inventory_lots?.map((lot) => {
          const sold = soldPerLot.get(lot.documentId);
          if (!sold) return lot;
          const currentAmount = Math.max(0, lot.currentAmount - sold);
          return { ...lot, currentAmount, state: currentAmount === 0 ? ("agotado" as const) : lot.state };
        });

        return { ...p, stock_central: p.stock_central - totalQty, inventory_lots };
      })
    );
    clearCartOf(cartId);
    toast.success("Venta completada", {
      description: `${soldItems.reduce((acc, i) => acc + i.quantity, 0)} artículo(s) vendido(s)`,
    });
  }

  return {
    carts,
    activeCartId,
    setActiveCartId,
    sidebarOpen,
    setSidebarOpen,
    sidebarWidth,
    addToCartOf,
    updateQuantityOf,
    removeItemOf,
    updateItemPriceOf,
    updateItemImpuestoOf,
    clearCartOf,
    setPriceModeOf,
    addCart,
    removeCart,
    handleSaleComplete,
  };
}
