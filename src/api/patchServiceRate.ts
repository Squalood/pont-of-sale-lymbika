import { authFetch } from "@/lib/auth";
import { ServiceRateType } from "@/types/service";

type PatchableServiceRateFields = Partial<Pick<ServiceRateType, "price">>;

/**
 * Sin permiso de `update` sobre service-rates para el rol del POS, `authFetch`
 * lanza `ForbiddenError`: quien llama lo distingue para decir qué falta.
 */
export async function patchServiceRate(
  documentId: string,
  data: PatchableServiceRateFields
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/service-rates/${documentId}`;
  const res = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    throw new Error(`Error al actualizar tarifa ${documentId}`);
  }
}
