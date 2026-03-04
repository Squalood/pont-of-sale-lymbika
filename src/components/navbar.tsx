"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuth, getUser, AuthUser } from "@/lib/auth";
import { useForbidden } from "@/lib/forbidden-context";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const { isForbidden } = useForbidden();

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
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-primary px-4 text-primary-foreground">
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="Logo" className="h-9 w-9 rounded-full" />
        <div>
          <h1 className="text-sm font-bold leading-tight">
            Farmacia Lymbika
            {user && (
              <span className="ml-2 font-normal opacity-70">— operador: {user.username}</span>
            )}
          </h1>
          <p className="text-xs text-primary-foreground/70">Punto de Venta</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
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
  );
}
