import { fmtMoney } from "@/lib/format";

interface TotalBannerProps {
  total: number;
}

export function TotalBanner({ total }: TotalBannerProps) {
  return (
    <div className="rounded-lg bg-primary p-4 text-center text-primary-foreground">
      <p className="text-sm font-medium">Total</p>
      <p className="text-3xl font-bold tracking-tight">{fmtMoney(total)}</p>
    </div>
  );
}
