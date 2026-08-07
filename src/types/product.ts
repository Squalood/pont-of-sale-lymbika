import { ServiceRateType } from "@/types/service";
import type { ImpuestoLinea, PriceMode } from "@/lib/pricing";

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
  // overrideImpuesto corrige el impuesto solo para esta venta; no existe en la rama service
  // porque los servicios son exentos y no se editan.
  | {
      type: "product";
      product: ProductType;
      quantity: number;
      overridePrice?: number;
      overrideImpuesto?: ImpuestoLinea;
      selectedLot?: SelectedLot;
    }
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
  /** Tarifa del carrito. Excluyente por construcción: ver PriceMode. */
  priceMode: PriceMode;
};

export type ProductType = {
  id: number;
  documentId: string;
  productName: string;
  slug: string;
  active: boolean;
  price: number | null;
  priceMember: number | null;
  /** Enum de Strapi ["iva0","iva8","iva16"]. Sin tipar a propósito: dato crudo de la API
   *  que se valida en `itemImpuesto`. Nulo en productos previos al campo. */
  impuesto?: string | null;
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