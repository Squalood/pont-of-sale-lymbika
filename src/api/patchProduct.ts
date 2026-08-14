import { authFetch } from "@/lib/auth";
import { ProductType } from "@/types/product";

type PatchableProductFields = Partial<
  Pick<ProductType, "price" | "priceMember" | "stock_central" | "active" | "impuesto">
>;

export async function patchProduct(
  documentId: string,
  data: PatchableProductFields
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products/${documentId}`;
  const res = await authFetch(url, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    throw new Error(`Error al actualizar producto ${documentId}`);
  }
}
