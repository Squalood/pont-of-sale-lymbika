import { authFetch } from "@/lib/auth";
import { CompraPayload } from "@/types/compra";

export async function postCompra(
  payload: CompraPayload,
  uploadId?: number
): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/compras-pos`;

  const body = {
    data: {
      ...payload,
      ...(uploadId !== undefined ? { archivo: uploadId } : {}),
    },
  };

  const res = await authFetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `Error al registrar la compra (${res.status})`
    );
  }

  const json = await res.json();
  return json.data.documentId as string;
}
