import { useCallback, useEffect, useState } from "react";
import { ProductType } from "@/types/product";
import { authFetch } from "@/lib/auth";

export function useGetProducts() {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products?populate=*&pagination[page]=1&pagination[pageSize]=5000&sort=createdAt:desc`;
  const [result, setResult] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(url);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      setResult(json.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { loading, result, error, refetch: fetchProducts };
}