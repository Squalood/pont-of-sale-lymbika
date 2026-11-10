import type { MetodoPago } from "@/types/venta";

/** Recargo que se cobra al cliente con membresía por pagar con tarjeta. */
export const CARD_SURCHARGE_RATE = 0.03;

/** Tolerancia al comparar montos en pesos, para que un centavo flotante no deje la venta como incompleta. */
export const MONEY_EPSILON = 0.001;

export type CashCurrency = "MXN" | "USD" | "tarjeta" | "transfe";

export interface CashEntry {
  amount: number;
  currency: CashCurrency;
}

export interface ChargeBreakdown {
  method: MetodoPago;
  /** Efectivo recibido, ya convertido a MXN. */
  cash: number;
  /** Dólares recibidos, sin convertir. */
  usd: number;
  /** Lo que se pasa en la terminal: incluye el recargo si el carrito es de membresía. */
  cardSwipe: number;
  /** Porción del swipe que cubre el total de la venta (swipe − recargo). */
  cardBase: number;
  cardSurcharge: number;
  transfeBase: number;
  /** cash + cardSwipe + transfeBase */
  receivedTotal: number;
  /** total + recargos: lo que de verdad hay que juntar. */
  effectiveTotal: number;
  /** Lo que falta por cobrar. Nunca negativo. */
  remaining: number;
  /** Cambio a devolver. Nunca negativo. */
  change: number;
  /** Lo recibido alcanza el `effectiveTotal`. Cuando es true, `remaining` es 0. */
  isCovered: boolean;
}

/**
 * Recargo de una venta ya registrada, para reimpresión y cuadre.
 *
 * Se prefiere `recargoTarjeta` guardado: es el monto que de verdad se cobró, con la tasa
 * vigente ese día. Las ventas anteriores al campo no lo traen, así que se despeja de
 * `montoTarjeta` (que siempre se guardó como base, sin recargo) asumiendo la tasa actual.
 */
export function ventaCardSurcharge(venta: {
  metodoPago: string;
  total: number;
  montoTarjeta?: number | null;
  recargoTarjeta?: number | null;
  esMembresia?: boolean | null;
}): number {
  if (venta.recargoTarjeta != null) return venta.recargoTarjeta;
  if (!venta.esMembresia) return 0;
  const cardBase = venta.montoTarjeta ?? 0;
  if (cardBase > 0) return cardBase * CARD_SURCHARGE_RATE;
  // Venta antigua de tarjeta pura sin `montoTarjeta`: el total ya incluye el recargo.
  if (venta.metodoPago === "tarjeta") return venta.total - venta.total / (1 + CARD_SURCHARGE_RATE);
  return 0;
}

/** Lo que se cobró en la terminal por esta venta: base + recargo. Es lo que reporta el banco. */
export function ventaCardCharged(venta: Parameters<typeof ventaCardSurcharge>[0]): number {
  const surcharge = ventaCardSurcharge(venta);
  const cardBase =
    venta.montoTarjeta ?? (venta.metodoPago === "tarjeta" ? venta.total - surcharge : 0);
  return cardBase + surcharge;
}

export type PagoParteTipo = "efectivo" | "dolares" | "tarjeta" | "transfe" | "mixto";

export interface PagoParte {
  tipo: PagoParteTipo;
  label: string;
  /** En la moneda de `moneda`: los dólares van sin convertir. */
  monto: number;
  moneda: "MXN" | "USD";
}

const PAGO_LABEL: Record<PagoParteTipo, string> = {
  efectivo: "Efectivo",
  dolares: "Dólares",
  tarjeta: "Tarjeta",
  transfe: "Transferencia",
  mixto: "Mixto",
};

/**
 * Con qué se pagó de verdad una venta ya registrada. `metodoPago: "mixto"` solo dice que
 * fueron varios, y "efectivo" no distingue pesos de dólares; aquí se reconstruye con los
 * montos que guarda la venta (en mixto `recibido` es solo el efectivo, ver CheckoutDialog).
 *
 * Montos: efectivo neto (recibido − cambio), tarjeta lo cobrado en terminal (con recargo,
 * igual que el corte de caja) y transferencia. Si una venta vieja no trae los montos,
 * regresa el método guardado tal cual en vez de inventar el reparto.
 */
export function ventaPagoPartes(
  venta: Parameters<typeof ventaCardSurcharge>[0] & {
    montoTransferencia?: number | null;
    recibido?: number | null;
    cambio?: number | null;
    recibidoUSD?: number | null;
    tipoCambioUsado?: number | null;
  }
): PagoParte[] {
  const parte = (tipo: PagoParteTipo, monto: number, moneda: "MXN" | "USD" = "MXN"): PagoParte => ({
    tipo,
    label: PAGO_LABEL[tipo],
    monto,
    moneda,
  });
  const metodo = venta.metodoPago as MetodoPago;

  if (metodo === "tarjeta") return [parte("tarjeta", venta.total)];
  if (metodo === "transfe") return [parte("transfe", venta.total)];

  const partes: PagoParte[] = [];
  const usd = venta.recibidoUSD ?? 0;
  // Si pagó todo en dólares y el cambio se dio en pesos, esto sale ≤ 0 y solo se muestran los dólares.
  const pesos = (venta.recibido ?? 0) - usd * (venta.tipoCambioUsado ?? 1) - (venta.cambio ?? 0);
  if (pesos > MONEY_EPSILON) partes.push(parte("efectivo", pesos));
  if (usd > MONEY_EPSILON) partes.push(parte("dolares", usd, "USD"));

  if (metodo === "mixto") {
    const tarjeta = ventaCardCharged(venta);
    if (tarjeta > MONEY_EPSILON) partes.push(parte("tarjeta", tarjeta));
    const transfe = venta.montoTransferencia ?? 0;
    if (transfe > MONEY_EPSILON) partes.push(parte("transfe", transfe));
  }

  if (partes.length === 0) return [parte(metodo === "mixto" ? "mixto" : "efectivo", venta.total)];
  return partes;
}

export function entryToMXN(entry: CashEntry, tipoCambio: number): number {
  return entry.currency === "USD" ? entry.amount * tipoCambio : entry.amount;
}

/**
 * Única fuente de verdad del cobro: a partir de las entradas de pago deriva el método,
 * los recargos y cuánto falta o sobra. La usan `CashInput` (UI), `CheckoutDialog`
 * (validación) y `useCheckout` (payload y recibo) para que no puedan desalinearse.
 */
export function computeCharge(
  entries: CashEntry[],
  total: number,
  isMember: boolean,
  tipoCambio: number
): ChargeBreakdown {
  const sumOf = (currency: CashCurrency) =>
    entries.reduce((sum, e) => sum + (e.currency === currency ? e.amount : 0), 0);

  const cardSwipe = sumOf("tarjeta");
  const transfeBase = sumOf("transfe");
  const usd = sumOf("USD");
  const cash = entries.reduce(
    (sum, e) => sum + (e.currency === "MXN" || e.currency === "USD" ? entryToMXN(e, tipoCambio) : 0),
    0
  );

  // El monto de la entrada `tarjeta` es lo que se cobra en la terminal, así que el
  // recargo se despeja hacia atrás: base = swipe / 1.03.
  const cardBase = isMember ? cardSwipe / (1 + CARD_SURCHARGE_RATE) : cardSwipe;
  const cardSurcharge = cardSwipe - cardBase;

  const hasCash = entries.some((e) => e.currency === "MXN" || e.currency === "USD");
  const hasCard = cardSwipe > 0;
  const hasTransfe = transfeBase > 0;
  const kindCount = [hasCash, hasCard, hasTransfe].filter(Boolean).length;
  const method: MetodoPago =
    kindCount > 1 ? "mixto" : hasCard ? "tarjeta" : hasTransfe ? "transfe" : "efectivo";

  const receivedTotal = cash + cardSwipe + transfeBase;
  const effectiveTotal = total + cardSurcharge;
  const isCovered = receivedTotal + MONEY_EPSILON >= effectiveTotal;

  return {
    method,
    cash,
    usd,
    cardSwipe,
    cardBase,
    cardSurcharge,
    transfeBase,
    receivedTotal,
    effectiveTotal,
    remaining: isCovered ? 0 : effectiveTotal - receivedTotal,
    change: Math.max(0, receivedTotal - effectiveTotal),
    isCovered,
  };
}
