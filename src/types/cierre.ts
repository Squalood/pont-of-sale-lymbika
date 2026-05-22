export interface CierreResumenData {
  pharmacyName?: string;
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
