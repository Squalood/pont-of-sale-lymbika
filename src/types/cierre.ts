export interface CierreResumenData {
  pharmacyName?: string;
  /** Solo los usa el ticket resumen para el encabezado. */
  pharmacyDireccion?: string | null;
  pharmacyTelefono?: string | null;
  /** Quien abrió el turno; `cerradoPor` puede ser otra persona. */
  operador?: string;
  tipoCambio?: number;
  apertura: string;
  cierre: string;
  cerradoPor: string;
  fondoInicial: number;
  ventasNetoMXN: number;
  devolucionesMXN: number;
  expectedMXN: number;
  expectedUSD: number;
  finalCashMXN: number;
  finalCashUSD: number;
  diffMXN: number;
  diffUSD: number;
  expectedCard: number;
  finalCard: number;
  diffCard: number;
  expectedTransfe: number;
  finalTransfe: number;
  diffTransfe: number;
}
