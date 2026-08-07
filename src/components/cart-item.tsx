"use client";

import { CartItem as CartItemType } from "@/types/product";
import { ServiceCartItem } from "@/components/cart/service-cart-item";
import { ProductCartItem } from "@/components/cart/product-cart-item";
import type { ImpuestoLinea, PriceMode } from "@/lib/pricing";

interface CartItemProps {
  item: CartItemType;
  priceMode: PriceMode;
  onUpdateQuantity: (itemKey: string, delta: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onUpdatePrice: (itemKey: string, newPrice: number | undefined) => void;
  onUpdateImpuesto: (itemKey: string, impuesto: ImpuestoLinea | undefined) => void;
}

export function CartItem({ item, priceMode, onUpdateQuantity, onRemoveItem, onUpdatePrice, onUpdateImpuesto }: CartItemProps) {
  if (item.type === "service") {
    return (
      <ServiceCartItem
        item={item}
        priceMode={priceMode}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
        onUpdatePrice={onUpdatePrice}
      />
    );
  }

  return (
    <ProductCartItem
      item={item}
      priceMode={priceMode}
      onUpdateQuantity={onUpdateQuantity}
      onRemoveItem={onRemoveItem}
      onUpdatePrice={onUpdatePrice}
      onUpdateImpuesto={onUpdateImpuesto}
    />
  );
}
