"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth";

export interface EfectivoCaja {
  fondoInicial: number;
  ventasNetoMXN: number;    // (recibidoMXN - cambio) de ventas en efectivo hoy
  devolucionesMXN: number;  // suma de montoReembolso de devoluciones en efectivo hoy
  efectivoMXN: number;      // fondoInicial + ventasNetoMXN - devolucionesMXN
  efectivoUSD: number;      // suma de recibidoUSD de ventas del día
}

export function useEfectivoCaja(fondoInicial: number | null) {
  const [result, setResult] = useState<EfectivoCaja | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEfectivo = useCallback(async () => {
    if (fondoInicial === null) return;
    setLoading(true);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaDesde = hoy.toISOString();

    try {
      const [ventasRes, devolucionesRes] = await Promise.all([
        authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ventas-pos` +
          `?filters[metodoPago][$eq]=efectivo` +
          `&filters[fecha][$gte]=${fechaDesde}` +
          `&fields[0]=recibido&fields[1]=cambio&fields[2]=recibidoUSD&fields[3]=tipoCambioUsado` +
          `&pagination[pageSize]=5000`
        ),
        authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devoluciones-pos` +
          `?filters[metodo][$eq]=Efectivo` +
          `&filters[fecha][$gte]=${fechaDesde}` +
          `&fields[0]=montoReembolso` +
          `&pagination[pageSize]=5000`
        ),
      ]);

      const ventasJson = await ventasRes.json();
      const devolucionesJson = await devolucionesRes.json();

      type VentaRow = { recibido: number; cambio: number; recibidoUSD: number; tipoCambioUsado: number };
      type DevRow = { montoReembolso: number };

      const ventas: VentaRow[] = ventasJson.data ?? [];
      const devoluciones: DevRow[] = devolucionesJson.data ?? [];

      let ventasNetoMXN = 0;
      let efectivoUSD = 0;

      for (const v of ventas) {
        const usd = v.recibidoUSD ?? 0;
        const tc = v.tipoCambioUsado ?? 1;
        const recibidoMXN = v.recibido - usd * tc;
        ventasNetoMXN += recibidoMXN - v.cambio;
        efectivoUSD += usd;
      }

      const totalDevolucionesMXN = devoluciones.reduce((sum, d) => sum + d.montoReembolso, 0);
      const efectivoMXN = fondoInicial + ventasNetoMXN - totalDevolucionesMXN;

      setResult({ fondoInicial, ventasNetoMXN, devolucionesMXN: totalDevolucionesMXN, efectivoMXN, efectivoUSD });
    } catch {
      // silently fail — badge simplemente no muestra datos actualizados
    } finally {
      setLoading(false);
    }
  }, [fondoInicial]);

  useEffect(() => {
    fetchEfectivo();
  }, [fetchEfectivo]);

  return { result, loading, refetch: fetchEfectivo };
}
