import { authFetch } from "@/lib/auth";
import { PharmacyType } from "@/types/pharmacy";

export async function getPharmacy(documentId: string): Promise<PharmacyType | null> {
  try {
    const res = await authFetch(`/api/pharmacies/${documentId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as PharmacyType;
  } catch {
    return null;
  }
}
