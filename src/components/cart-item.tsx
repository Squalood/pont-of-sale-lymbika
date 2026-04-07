"use client";

import { CartItem as CartItemType } from "@/types/product";
import { ServiceCartItem } from "@/components/cart/service-cart-item";
import { ProductCartItem } from "@/components/cart/product-cart-item";

interface CartItemProps {
  item: CartItemType;
  isMember: boolean;
  onUpdateQuantity: (itemKey: string, delta: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onUpdatePrice: (itemKey: string, newPrice: number | undefined) => void;
}

export function CartItem({ item, isMember, onUpdateQuantity, onRemoveItem, onUpdatePrice }: CartItemProps) {
  if (item.type === "service") {
    return (
      <ServiceCartItem
        item={item}
        isMember={isMember}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
        onUpdatePrice={onUpdatePrice}
      />
    );
  }

  return (
    <ProductCartItem
      item={item}
      isMember={isMember}
      onUpdateQuantity={onUpdateQuantity}
      onRemoveItem={onRemoveItem}
      onUpdatePrice={onUpdatePrice}
    />
  );
}
