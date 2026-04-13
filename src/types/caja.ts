export interface CajaType {
  id: number;
  documentId: string;
  fecha: string;
  fondoInicial: number;
  tipoCambio: number;
  estado: "Abierta" | "Cerrada";
  operador: string;
}

export interface CajaPayload {
  fecha: string;
  fondoInicial: number;
  tipoCambio: number;
  estado: "Abierta" | "Cerrada";
  operador: string;
}