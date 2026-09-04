"use client";

import { useEffect, useState } from "react";
import { ServiceRateType } from "@/types/service";
import { authFetch } from "@/lib/auth";

/**
 * Tarifas de consulta para el POS. `medical_service` tiene tres tipos en Strapi
 * (consultation, procedure, study) pero aquí solo se cobran consultas, así que
 * se filtra en el servidor: lo que no entra no hay que acordarse de esconderlo
 * después en cada vista. De paso baja el payload de 240 KB a 122 KB.
 *
 * El filtro por tipo ya implica que hay `medical_service`, así que sustituye al
 * `$notNull` que había antes.
 */
export function useGetServiceRates() {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/service-rates?populate[medical_service][populate]=*&populate[doctor][fields][0]=doctorName&pagination[pageSize]=500&filters[medical_service][type][$eq]=consultation`;
  const [result, setResult] = useState<ServiceRateType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(url);
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const json = await res.json();
        setResult(json.data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        setLoading(false);
      }
    })();
  }, [url]);

  return { loading, result, error };
}