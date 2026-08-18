import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type KpiTone = "blue" | "green" | "purple" | "amber" | "rose" | "slate";

const TONES: Record<KpiTone, { color: string; bg: string }> = {
  blue: { color: "text-blue-600", bg: "bg-blue-50" },
  green: { color: "text-green-600", bg: "bg-green-50" },
  purple: { color: "text-purple-600", bg: "bg-purple-50" },
  amber: { color: "text-amber-600", bg: "bg-amber-50" },
  rose: { color: "text-rose-600", bg: "bg-rose-50" },
  slate: { color: "text-slate-600", bg: "bg-slate-100" },
};

interface KpiCardProps {
  label: string;
  /** Ya formateado por el llamador. */
  value: string;
  icon: LucideIcon;
  tone?: KpiTone;
  /** Nota al pie de la cifra, para matices como "3 compras sin costo registrado". */
  hint?: React.ReactNode;
}

export function KpiCard({ label, value, icon: Icon, tone = "blue", hint }: KpiCardProps) {
  const { color, bg } = TONES[tone];

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`rounded-lg p-2 ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
