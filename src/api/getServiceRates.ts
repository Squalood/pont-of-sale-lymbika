"use client";

import { useEffect, useState } from "react";
import { ServiceRateType } from "@/types/service";
import { authFetch } from "@/lib/auth";

export function useGetServiceRates() {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/service-rates?populate[medical_service][populate]=*&populate[doctor][fields][0]=doctorName&pagination[pageSize]=500&filters[medical_service][id][$notNull]=true`;
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