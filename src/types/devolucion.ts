import { VentaItemType } from "@/types/venta";
import { PharmacyType } from "@/types/pharmacy";

export interface DevolucionItem {
  product: string | null; // documentId
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
}

export interface DevolucionType {
  id: number;
  documentId: string;
  fecha: string;
  motivo: string;
  metodo: "Efectivo" | "Tarjeta";
  montoReembolso: number;
  estado: "Completada" | "Cancelada";
  operador: string;
  items: VentaItemType[];
  venta: {
    id: number;
    documentId: string;
  } | null;
  pharmacies?: PharmacyType[] | null;
}

export interface DevolucionPayload {
  fecha: string;
  motivo: string;
  metodo: "Efectivo" | "Tarjeta";
  montoReembolso: number;
  estado: "Completada" | "Cancelada";
  operador: string;
  items: DevolucionItem[];
  venta: string; // venta documentId
  pharmacies?: string;
}