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

export type SelectedLot = {
  documentId: string;
  lotNumber: string;
  expirationDate: string | null;
};

export type CartItem =
  // selectedLot es opcional: un producto aún sin lotes capturados se vende solo por stock_central.
  | { type: "product"; product: ProductType; quantity: number; overridePrice?: number; selectedLot?: SelectedLot }
  | { type: "service"; serviceRate: ServiceRateType; quantity: number; overridePrice?: number };

export function cartItemKey(item: CartItem): string {
  if (item.type !== "product") return `s-${item.serviceRate.id}`;
  return item.selectedLot
    ? `p-${item.product.id}-${item.selectedLot.documentId}`
    : `p-${item.product.id}`;
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
  inventory_lots?: InventoryLotOnProduct[];
};

export type InventoryLotOnProduct = {
  id: number;
  documentId: string;
  lotNumber: string;
  expirationDate: string | null;
  initialQuantity: number;
  currentAmount: number;
  state: "activo" | "agotado" | "vencido";
};