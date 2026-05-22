import { authFetch } from "@/lib/auth";
import { patchCaja } from "@/api/patchCaja";

export async function autoCloseCajas(pharmacyId: string): Promise<void> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const url =
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/cajas-pos` +
    `?filters[estado][$eq]=Abierta` +
    `&filters[fecha][$lt]=${hoy.toISOString()}` +
    `&filters[pharmacy][documentId][$eq]=${pharmacyId}` +
    `&fields[0]=documentId` +
    `&pagination[pageSize]=100`;

  const res = await authFetch(url);
  if (!res.ok) return;

  const json = await res.json();
  const cajas: { documentId: string }[] = json.data ?? [];

  await Promise.all(
    cajas.map((caja) =>
      patchCaja(caja.documentId, {
        estado: "Cerrada",
        finalCashMXN: 0,
        finalCashUSD: 0,
        expectedMXN: 0,
        expectedUSD: 0,
        diffMXN: 0,
        diffUSD: 0,
        expectedCard: 0,
        finalCard: 0,
        diffCard: 0,
        expectedTransfe: 0,
        finalTransfe: 0,
        diffTransfe: 0,
        closedAt: new Date().toISOString(),
        closedBy: "auto-cierre",
      }).catch(() => {})
    )
  );
}
