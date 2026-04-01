import { useState } from "react";
import { Cart, CartItem, ProductType, cartItemKey } from "@/types/product";

export const CART_VW = 25;
export const MAX_CARTS = 4;

export function useMultiCart(
  setProducts: React.Dispatch<React.SetStateAction<ProductType[]>>
) {
  const [carts, setCarts] = useState<Cart[]>([{ id: 1, items: [], isMember: false }]);
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
          return { ...cart, items: cart.items.map((i) => cartItemKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i) };
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

  function clearCartOf(cartId: number) {
    setCarts((prev) =>
      prev.map((cart) => cart.id !== cartId ? cart : { ...cart, items: [] })
    );
  }

  function setMemberOf(cartId: number, val: boolean) {
    setCarts((prev) =>
      prev.map((cart) => cart.id !== cartId ? cart : { ...cart, isMember: val })
    );
  }

  function addCart() {
    if (carts.length >= MAX_CARTS) return;
    const id = nextCartId;
    setCarts((prev) => [...prev, { id, items: [], isMember: false }]);
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
    setProducts((prev) =>
      prev.map((p) => {
        const sold = soldItems.find((i) => i.type === "product" && i.product.id === p.id);
        if (sold && sold.type === "product") {
          return { ...p, stock_central: p.stock_central - sold.quantity };
        }
        return p;
      })
    );
    clearCartOf(cartId);
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
    clearCartOf,
    setMemberOf,
    addCart,
    removeCart,
    handleSaleComplete,
  };
}
