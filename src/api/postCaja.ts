import { CajaPayload, CajaType } from "@/types/caja";
import { authFetch } from "@/lib/auth";

export async function postCaja(payload: CajaPayload): Promise<CajaType> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/cajas-pos`;

  const res = await authFetch(url, {
    method: "POST",
    body: JSON.stringify({ data: payload }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `Error al abrir la caja (${res.status})`
    );
  }

  const json = await res.json();
  return json.data as CajaType;
}
