import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";

/** Lo que se usa mientras carga, si Strapi no responde o si el campo viene vacío. */
export const DEFAULT_MEMBERSHIP_NAME = "Health Pass";

interface SiteConfigType {
  membershipName?: string | null;
}

/**
 * Un solo pedido por carga de página, compartido por todos los componentes que piden el
 * nombre. Si falla (sin sesión, 403, red) se descarta para que el próximo montaje reintente.
 */
let cached: string | null = null;
let pending: Promise<string> | null = null;

function fetchMembershipName(): Promise<string> {
  pending ??= authFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/site-config?fields[0]=membershipName`)
    .then(async (res) => {
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const name = (json.data as SiteConfigType | null)?.membershipName?.trim();
      cached = name || DEFAULT_MEMBERSHIP_NAME;
      return cached;
    })
    .catch(() => {
      pending = null;
      return DEFAULT_MEMBERSHIP_NAME;
    });
  return pending;
}

/** Nombre comercial de la membresía (`site-config.membershipName`). */
export function useMembershipName(): string {
  const [name, setName] = useState(cached ?? DEFAULT_MEMBERSHIP_NAME);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    fetchMembershipName().then((n) => {
      if (!cancelled) setName(n);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return name;
}
