import { Spinner } from "@/components/ui/spinner";
import { ProductCard } from "@/components/product-card";
import { ProductType } from "@/types/product";

interface ProductGridProps {
  products: ProductType[];
  loading: boolean;
  error: string | null;
  onProductClick: (product: ProductType) => void;
}

export function ProductGrid({ products, loading, error, onProductClick }: ProductGridProps) {
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
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={onProductClick}
        />
      ))}
    </div>
  );
}
