"use client";

import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6 flex-1 min-h-0 overflow-y-auto">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-muted-foreground">
        <LayoutDashboard className="h-12 w-12 stroke-1" />
        <p className="text-lg font-medium">Próximamente</p>
        <p className="text-sm">El dashboard general estará disponible aquí</p>
      </div>
    </div>
  );
}
