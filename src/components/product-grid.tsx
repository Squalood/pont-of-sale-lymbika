import { Spinner } from "@/components/ui/spinner";
import { ProductCard } from "@/components/product-card";
import { ServiceCard } from "@/components/service-card";
import { GridItem } from "@/types/product";

interface ProductGridProps {
  items: GridItem[];
  loading: boolean;
  error: string | null;
  onItemClick: (item: GridItem) => void;
}

export function ProductGrid({ items, loading, error, onItemClick }: ProductGridProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(max(160px,20%),1fr))]">
      {items.map((item) =>
        item.type === "product" ? (
          <ProductCard
            key={`p-${item.data.id}`}
            product={item.data}
            onClick={(p) => onItemClick({ type: "product", data: p })}
          />
        ) : (
          <ServiceCard
            key={`s-${item.data.id}`}
            service={item.data}
            onClick={(s) => onItemClick({ type: "service", data: s })}
          />
        )
      )}
    </div>
  );
}
