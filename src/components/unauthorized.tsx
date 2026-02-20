"use client";

import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuth } from "@/lib/auth";

export function Unauthorized() {
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <ShieldX className="h-16 w-16 stroke-1 text-destructive" />
      <div>
        <h2 className="text-xl font-semibold">Acceso denegado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu cuenta no tiene permisos para acceder a este sistema.
          <br />
          Contacta al administrador para solicitar acceso.
        </p>
      </div>
      <Button variant="destructive" onClick={handleLogout}>
        Cerrar sesión
      </Button>
    </div>
  );
}
