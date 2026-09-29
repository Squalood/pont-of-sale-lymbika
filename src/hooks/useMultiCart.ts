import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cart, CartItem, ProductType, cartItemKey } from "@/types/product";
import type { ImpuestoLinea, PriceMode } from "@/lib/pricing";
import type { StockLevel } from "@/api/posStock";
import { applyLocalSale, applyStockLevels } from "@/lib/stock";

export const CART_VW = 25;
export const MAX_CARTS = 4;

// Los carritos viven en el estado de la página, que se desmonta al ir a /admin. Se guardan
// en sessionStorage para recuperarlos al volver (o al recargar). Es por pestaña: dos cajas
// abiertas no se pisan, y cerrar la pestaña no deja una venta a medias para el día siguiente.
const STORAGE_KEY = "pos:carts";

type PersistedCarts = {
  carts: Cart[];
  nextCartId: number;
  activeCartId: number;
  sidebarOpen: boolean;
};

function readPersisted(): PersistedCarts | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedCarts;
    if (!Array.isArray(data.carts) || data.carts.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export function useMultiCart(
  setProducts: React.Dispatch<React.SetStateAction<ProductType[]>>
) {
  const [carts, setCarts] = useState<Cart[]>([{ id: 1, items: [], priceMode: "regular" }]);
  const [nextCartId, setNextCartId] = useState(2);
  const [activeCartId, setActiveCartId] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Se restaura en un efecto y no en el inicializador de useState: la página también se
  // renderiza en el servidor, donde no hay sessionStorage, y leerlo antes rompería la hidratación.
  useEffect(() => {
    const saved = readPersisted();
    if (saved) {
      setCarts(saved.carts);
      setNextCartId(saved.nextCartId);
      setActiveCartId(saved.activeCartId);
      setSidebarOpen(saved.sidebarOpen);
    }
    setHydrated(true);
  }, []);

  // Sin la bandera, el primer render guardaría el carrito vacío encima del que falta restaurar.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const data: PersistedCarts = { carts, nextCartId, activeCartId, sidebarOpen };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage lleno o bloqueado: el carrito sigue funcionando, solo no sobrevive a la navegación.
    }
  }, [hydrated, carts, nextCartId, activeCartId, sidebarOpen]);

  // Un carrito restaurado trae la foto del producto de cuando se agregó. Al llegar el catálogo
  // fresco se reemplaza, para que el stock y los lotes que muestra la línea sean los actuales.
  // No se recortan cantidades: vender más de lo que hay se permite y lo avisa la línea.
  function refreshCartProducts(fresh: ProductType[]) {
    if (fresh.length === 0) return;
    const byId = new Map(fresh.map((p) => [p.id, p]));
    setCarts((prev) =>
      prev.map((cart) => ({
        ...cart,
        items: cart.items.map((item) => {
          if (item.type !== "product") return item;
          const product = byId.get(item.product.id);
          return product ? { ...item, product } : item;
        }),
      }))
    );
  }

  const sidebarWidth = `${100 - carts.length * CART_VW}vw`;

  function addToCartOf(cartId: number, item: CartItem) {
    setCarts((prev) =>
      prev.map((cart) => {
        if (cart.id !== cartId) return cart;
        const key = cartItemKey(item);
        const existing = cart.items.find((i) => cartItemKey(i) === key);
        // Sin tope por lote ni por stock: "avisar pero permitir". Si la línea pide más de lo que
        // tiene su lote, el servidor completa con otros lotes o sin lote y deja el stock en negativo.
        if (existing) {
          const newQty = existing.quantity + item.quantity;
          return { ...cart, items: cart.items.map((i) => cartItemKey(i) === key ? { ...i, quantity: newQty } : i) };
        }
        return { ...cart, items: [...cart.items, item] };
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
            .map((item) => cartItemKey(item) === itemKey ? { ...item, quantity: item.quantity + delta } : item)
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

  function handleSaleComplete(cartId: number, soldItems: CartItem[], levels?: StockLevel[]) {
    const productLines = soldItems.filter(
      (i): i is Extract<CartItem, { type: "product" }> => i.type === "product"
    );
    setProducts((prev) =>
      prev.map((p) => {
        const lines = productLines.filter((l) => l.product.id === p.id);
        if (lines.length === 0) return p;
        // Lo normal: el servidor respondió con los valores reales tras la transacción.
        if (levels) return applyStockLevels(p, levels);

        // El descuento quedó en la cola: aproximación local, agregada por producto [A3].
        const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
        const soldPerLot = new Map<string, number>();
        lines.forEach((l) => {
          if (!l.selectedLot) return;
          soldPerLot.set(l.selectedLot.documentId, (soldPerLot.get(l.selectedLot.documentId) ?? 0) + l.quantity);
        });
        return applyLocalSale(p, totalQty, soldPerLot);
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
    refreshCartProducts,
  };
}
