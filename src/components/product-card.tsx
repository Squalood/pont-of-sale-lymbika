"use client";

import { ProductType } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

interface ProductCardProps {
  product: ProductType;
  onClick: (product: ProductType) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const imageUrl = product.images?.[0]?.url;

  return (
    <Card
      className="flex h-full cursor-pointer flex-col p-4 transition-shadow hover:shadow-md"
      onClick={() => onClick(product)}
    >
      <div className="flex items-start justify-between">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.productName}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-lg">
            💊
          </div>
        )}
        {product.tipo === "receta" && (
          <Badge variant="outline" className="gap-1 border-primary text-primary text-xs">
            <ShieldCheck className="h-3 w-3" />
            Receta
          </Badge>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-medium text-foreground" title={product.productName}>
        {product.productName}
      </h3>
      <p className="line-clamp-2 min-h-10 text-sm font-light text-neutral-400" title={product.sal}>
        {product.sal}
      </p>
      <div className="mt-auto flex items-end justify-between pt-2">
        <span className="text-lg font-bold text-primary">
          ${product.price.toFixed(2)}
        </span>
        <span className="text-lg font-bold text-emerald-400">
          ${product.priceMember}
        </span>
        <span className="text-xs text-muted-foreground">{product.category?.categoryName}</span>
      </div>
    </Card>
  );
}
