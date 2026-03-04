import { authFetch } from "@/lib/auth";
import { DevolucionPayload } from "@/types/devolucion";

export async function postDevolucion(payload: DevolucionPayload): Promise<number> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devoluciones-pos`;

  const res = await authFetch(url, {
    method: "POST",
    body: JSON.stringify({ data: payload }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `Error al registrar la devolución (${res.status})`
    );
  }

  const json = await res.json();
  return json.data.id as number;
}
