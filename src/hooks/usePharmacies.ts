import { useEffect, useState } from "react";
import { fetchPharmacies } from "@/api/getPharmacies";
import type { PharmacyType } from "@/types/pharmacy";

/** Farmacias activas, ordenadas por nombre. */
export function usePharmacies() {
  const [pharmacies, setPharmacies] = useState<PharmacyType[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchPharmacies()
      .then((p) => alive && setPharmacies(p))
      .catch(() => alive && setPharmacies([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);
  return { pharmacies, loading };
}
