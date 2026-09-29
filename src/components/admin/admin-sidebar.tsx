"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Receipt, Package, ArrowLeft, LogOut, Settings, RotateCcw, ShoppingBag, Vault, FileText, CalendarClock, Warehouse, ArrowLeftRight } from "lucide-react";
import { clearAuth } from "@/lib/auth";

// Dos bloques: lo que pasa en caja (ventas, dinero) y lo que hay en anaqueles (inventario).
const navGroups = [
  {
    title: "Ventas",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/ventas", label: "Historial de Ventas", icon: Receipt },
      { href: "/admin/cajas", label: "Historial de Cajas", icon: Vault },
      { href: "/admin/devoluciones", label: "Devoluciones", icon: RotateCcw },
      { href: "/admin/facturas", label: "Facturas", icon: FileText },
    ],
  },
  {
    title: "Inventario",
    items: [
      { href: "/admin/compras", label: "Compras", icon: ShoppingBag },
      { href: "/admin/productos", label: "Productos", icon: Package },    
      { href: "/admin/traspasos", label: "Traspasos", icon: ArrowLeftRight },
      { href: "/admin/stock", label: "Stock por farmacia", icon: Warehouse },
      { href: "/admin/caducidades", label: "Caducidades", icon: CalendarClock },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <Settings className="h-5 w-5 text-primary" />
        <span className="font-bold">Admin Panel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
              {group.title}
            </p>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-3 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al POS
        </Link>
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50">
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
