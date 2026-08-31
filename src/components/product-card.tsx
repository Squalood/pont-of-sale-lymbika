"use client";

import { useState } from "react";
import { ProductType } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { urlImagen } from "@/lib/media";

interface ProductCardProps {
  product: ProductType;
  onClick: (product: ProductType) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  // Se muestra a 40 px: la variante de 128 cubre pantallas de alta densidad
  // y pesa ~2.5 KB en lugar de los ~75 KB del original.
  const imageUrl = urlImagen(product.images?.[0]?.url, 128);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Card
      className="flex h-full cursor-pointer flex-col p-4 transition-shadow hover:shadow-md"
      onClick={() => onClick(product)}
    >
      <div className="flex items-start justify-between">
        {imageUrl ? (
          <div className="relative h-10 w-10">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center rounded bg-muted">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={product.productName}
              className={`h-10 w-10 rounded object-cover transition-opacity ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-lg">
            💊
          </div>
        )}
        {product.conReceta && (
          <Badge
            variant="outline"
            className="gap-1 border-primary text-primary text-xs"
          >
            <ShieldCheck className="h-3 w-3" />
            Receta
          </Badge>
        )}
      </div>
      <div>
        <h3
          className="mt-2 line-clamp-2 min-h-10 text-sm font-medium text-foreground"
          title={product.productName}
        >
          {product.productName}
        </h3>
        <p
          className="line-clamp-2 min-h-10 text-xs font-light text-neutral-400"
          title={product.sal}
        >
          {product.sal}
        </p>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-x-2 gap-y-1 pt-2">
        <span className="text-lg font-bold text-primary">
          ${(product.price ?? 0).toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground text-right">
          {product.category?.categoryName}
        </span>
        <span className="col-span-2 text-xs text-muted-foreground">
          Stock: {product.stock_central}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full gap-1 text-xs"
        onClick={(e) => {
          e.stopPropagation();
          window.open(
            `${process.env.NEXT_PUBLIC_WEBSHOP_URL}/product/${product.slug}`,
            "_blank",
          );
        }}
      >
        <ExternalLink className="h-3 w-3" />
        Ver en eShop
      </Button>
    </Card>
  );
}
