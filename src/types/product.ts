import { ServiceRateType } from "@/types/service";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  emoji: string;
  requiresPrescription?: boolean;
}

export type CartItem =
  | { type: "product"; product: ProductType; quantity: number; overridePrice?: number }
  | { type: "service"; serviceRate: ServiceRateType; quantity: number; overridePrice?: number };

export function cartItemKey(item: CartItem): string {
  return item.type === "product" ? `p-${item.product.id}` : `s-${item.serviceRate.id}`;
}

export type GridItem =
  | { type: "product"; data: ProductType }
  | { type: "service"; data: ServiceRateType };

export type Cart = {
  id: number;
  items: CartItem[];
  isMember: boolean;
};

export type ProductType = {
  id: number;
  documentId: string;
  productName: string;
  slug: string;
  active: boolean;
  price: number | null;
  priceMember: number | null;
  tipo: string;
  images: {
    id: number;
    url: string;
  }[];
  category: {
    id: number;
    categoryName: string;
    slug: string;
  };
  sal: string;
  conReceta: boolean;
  sku: string;
  barCode: string;
  stock_central: number;
};