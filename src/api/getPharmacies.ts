import { authFetch } from "@/lib/auth";
import { PharmacyType } from "@/types/pharmacy";

export async function fetchPharmacies(): Promise<PharmacyType[]> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pharmacies?filters[estado][$eq]=activo&sort=nombre:asc`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const json = await res.json();
  return json.data as PharmacyType[];
}
