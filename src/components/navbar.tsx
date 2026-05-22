"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Settings, DoorClosed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { clearAuth, getUser, AuthUser } from "@/lib/auth";
import { useForbidden } from "@/lib/forbidden-context";
import { useCaja } from "@/lib/caja-context";
import { CierreCajaDialog } from "@/components/cierre-caja-dialog";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const { isForbidden } = useForbidden();
  const { caja, efectivo } = useCaja();
  const [cierreOpen, setCierreOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setMounted(true);
  }, [pathname]);

  if (!mounted || !user) return null;

  function handleLogout() {
    clearAuth();
    setUser(null);
    router.push("/login");
  }

  return (
    <>
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-primary px-4 text-primary-foreground">
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="Logo" className="h-9 w-9 rounded-full" />
        <div>
          <h1 className="text-sm font-bold leading-tight">
            {caja?.pharmacy?.nombre ?? "Caja no Iniciada"}
            {user && (
              <span className="ml-2 font-normal opacity-70">— operador: {user.username}</span>
            )}
          </h1>
          <p className="text-xs text-primary-foreground/70">Punto de Venta</p>
        </div>
        {caja && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="cursor-default bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30">
                  USD ${caja.tipoCambio.toFixed(2)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="space-y-1 text-xs">
                <p><span className="font-semibold">Apertura:</span> {new Date(caja.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
                <p><span className="font-semibold">Fondo inicial:</span> ${caja.fondoInicial.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                <p><span className="font-semibold">Operador:</span> {caja.operador}</p>
                <p><span className="font-semibold">Sucursal:</span> {caja.pharmacy?.nombre}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {efectivo && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="cursor-default bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30">
                  Caja ${efectivo.efectivoMXN.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="space-y-1 text-xs">
                <p><span className="font-semibold">Fondo inicial:</span> ${efectivo.fondoInicial.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                <p><span className="font-semibold">Ventas efectivo:</span> ${efectivo.ventasNetoMXN.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                {efectivo.devolucionesMXN > 0 && (
                  <p><span className="font-semibold">Devoluciones:</span> -${efectivo.devolucionesMXN.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                )}
                {efectivo.efectivoUSD > 0 && (
                  <p><span className="font-semibold">Dólares:</span> ${efectivo.efectivoUSD.toFixed(2)} USD</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex items-center gap-2">
          {caja && (
            <Button
              variant="destructive"
              size="sm"
              className="h-8 gap-2 text-xs"
              onClick={() => setCierreOpen(true)}
            >
              <DoorClosed className="h-4 w-4" />
              Cerrar Caja
            </Button>
          )}
          {!isForbidden && (
            <Link href="/admin">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-xs text-white hover:bg-primary-foreground/10"
              >
                <Settings className="h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-primary-foreground/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
      </div>
    </header>

    <CierreCajaDialog open={cierreOpen} onClose={() => setCierreOpen(false)} />
    </>
  );
}
