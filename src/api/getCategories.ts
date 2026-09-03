import { CategoryType } from "@/types/category";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";

export function useGetCategories() {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/categories?populate=*`;
  const [result, setResult] = useState<CategoryType[]>([]);
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

/**
 * Solo los nombres, para el filtro de la tabla de productos. El hook de arriba
 * pide `populate=*`, que arrastra imagen y descripción de cada categoría; aquí
 * lo único que se pinta es el texto del <SelectItem>.
 */
export function useGetCategoryNames() {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/categories?fields[0]=categoryName&sort=categoryName:asc&pagination[pageSize]=200`;
  const [result, setResult] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(url);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setResult(
          (json.data ?? [])
            .map((c: { categoryName?: string }) => c.categoryName)
            .filter((name: string | undefined): name is string => !!name)
        );
      } catch {
        // El filtro se queda en "Todas las categorías": no vale la pena romper
        // la tabla porque falle el desplegable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return result;
}
