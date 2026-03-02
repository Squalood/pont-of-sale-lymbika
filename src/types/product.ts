export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  emoji: string;
  requiresPrescription?: boolean;
}

export interface CartItem {
  product: ProductType;
  quantity: number;
}

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
  stock: number;
};