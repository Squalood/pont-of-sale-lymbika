import { PharmacyType } from "./pharmacy";

export interface CajaType {
  id: number;
  documentId: string;
  fecha: string;
  fondoInicial: number;
  tipoCambio: number;
  estado: "Abierta" | "Cerrada";
  operador: string;
  pharmacy?: PharmacyType | null;
  finalCashMXN?: number | null;
  finalCashUSD?: number | null;
  expectedMXN?: number | null;
  expectedUSD?: number | null;
  diffMXN?: number | null;
  diffUSD?: number | null;
  expectedCard?: number | null;
  finalCard?: number | null;
  diffCard?: number | null;
  expectedTransfe?: number | null;
  finalTransfe?: number | null;
  diffTransfe?: number | null;
  closedAt?: string | null;
  closedBy?: string | null;
}

export interface CajaPayload {
  fecha: string;
  fondoInicial: number;
  tipoCambio: number;
  estado: "Abierta" | "Cerrada";
  operador: string;
  pharmacy?: string;
}

export interface CajaCierrePayload {
  estado: "Cerrada";
  finalCashMXN: number;
  finalCashUSD: number;
  expectedMXN: number;
  expectedUSD: number;
  diffMXN: number;
  diffUSD: number;
  expectedCard: number;
  finalCard: number;
  diffCard: number;
  expectedTransfe: number;
  finalTransfe: number;
  diffTransfe: number;
  closedAt: string;
  closedBy: string;
}