import { CajaCierrePayload, CajaType } from "@/types/caja";
import { authFetch } from "@/lib/auth";

export async function patchCaja(documentId: string, payload: CajaCierrePayload): Promise<CajaType> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/cajas-pos/${documentId}`;

  const res = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify({ data: payload }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `Error al cerrar la caja (${res.status})`
    );
  }

  const json = await res.json();
  return json.data as CajaType;
}
