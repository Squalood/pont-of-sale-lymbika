import { authFetch } from "@/lib/auth";
import { DevolucionType } from "@/types/devolucion";

export async function getDevolucionesByVenta(ventaId: number): Promise<DevolucionType[]> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devoluciones-pos?filters[venta][id][$eq]=${ventaId}&populate[items][populate][product][fields][0]=id`;

  const res = await authFetch(url);
  if (!res.ok) throw new Error(`Error al obtener devoluciones (${res.status})`);

  const json = await res.json();
  return json.data as DevolucionType[];
}
