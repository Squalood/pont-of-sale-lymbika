import { authFetch } from "@/lib/auth";
import { ProveedorPayload, ProveedorType } from "@/types/proveedor";

export async function postProveedor(payload: ProveedorPayload): Promise<ProveedorType> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/proveedores`;

  const res = await authFetch(url, {
    method: "POST",
    body: JSON.stringify({ data: payload }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `Error al crear proveedor (${res.status})`
    );
  }

  const json = await res.json();
  return json.data as ProveedorType;
}
