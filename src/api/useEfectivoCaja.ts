"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth";

export interface EfectivoCaja {
  fondoInicial: number;
  ventasNetoMXN: number;
  devolucionesMXN: number;
  efectivoMXN: number;
  efectivoUSD: number;
  ventasTarjeta: number;
  ventasTransfe: number;
}

export function useEfectivoCaja(fondoInicial: number | null, pharmacyId: string | null) {
  const [result, setResult] = useState<EfectivoCaja | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEfectivo = useCallback(async () => {
    if (fondoInicial === null || !pharmacyId) return;
    setLoading(true);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaDesde = hoy.toISOString();
    const pharmacyFilter = `&filters[pharmacies][documentId][$eq]=${pharmacyId}`;

    try {
      const [ventasRes, devolucionesRes] = await Promise.all([
        authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ventas-pos` +
          `?filters[fecha][$gte]=${fechaDesde}` +
          `&filters[estado][$ne]=cancelada` +
          pharmacyFilter +
          `&fields[0]=metodoPago&fields[1]=recibido&fields[2]=cambio` +
          `&fields[3]=recibidoUSD&fields[4]=tipoCambioUsado` +
          `&fields[5]=montoTarjeta&fields[6]=montoTransferencia&fields[7]=total` +
          `&pagination[pageSize]=5000`
        ),
        authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devoluciones-pos` +
          `?filters[metodo][$eq]=Efectivo` +
          `&filters[fecha][$gte]=${fechaDesde}` +
          pharmacyFilter +
          `&fields[0]=montoReembolso` +
          `&pagination[pageSize]=5000`
        ),
      ]);

      const ventasJson = await ventasRes.json();
      const devolucionesJson = await devolucionesRes.json();

      type VentaRow = {
        metodoPago: string;
        recibido: number; cambio: number;
        recibidoUSD: number; tipoCambioUsado: number;
        montoTarjeta?: number; montoTransferencia?: number; total: number;
      };
      type DevRow = { montoReembolso: number };

      const ventas: VentaRow[] = ventasJson.data ?? [];
      const devoluciones: DevRow[] = devolucionesJson.data ?? [];

      let ventasNetoMXN = 0;
      let efectivoUSD = 0;
      let ventasTarjeta = 0;
      let ventasTransfe = 0;

      for (const v of ventas) {
        if (v.metodoPago === "efectivo" || v.metodoPago === "mixto") {
          const usd = v.recibidoUSD ?? 0;
          const tc = v.tipoCambioUsado ?? 1;
          const recibidoMXN = (v.recibido ?? 0) - usd * tc;
          ventasNetoMXN += recibidoMXN - (v.cambio ?? 0);
          efectivoUSD += usd;
        }
        if (v.metodoPago === "tarjeta") ventasTarjeta += v.total;
        if (v.metodoPago === "mixto") {
          ventasTarjeta += v.montoTarjeta ?? 0;
          ventasTransfe += v.montoTransferencia ?? 0;
        }
        if (v.metodoPago === "transfe") ventasTransfe += v.total;
      }

      const totalDevolucionesMXN = devoluciones.reduce((sum, d) => sum + d.montoReembolso, 0);
      const efectivoMXN = fondoInicial + ventasNetoMXN - totalDevolucionesMXN;

      setResult({ fondoInicial, ventasNetoMXN, devolucionesMXN: totalDevolucionesMXN, efectivoMXN, efectivoUSD, ventasTarjeta, ventasTransfe });
    } catch {
      // silently fail — badge simplemente no muestra datos actualizados
    } finally {
      setLoading(false);
    }
  }, [fondoInicial, pharmacyId]);

  useEffect(() => {
    fetchEfectivo();
  }, [fetchEfectivo]);

  return { result, loading, refetch: fetchEfectivo };
}
