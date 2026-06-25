import { CompraItem } from "@/types/compra";

export interface LocalItem extends CompraItem {
  productId: number | null;
}
