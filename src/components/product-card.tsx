"use client";

import { ProductType } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { urlImagen } from "@/lib/media";
import { isPerPharmacy, localMinStock, localStock } from "@/lib/stock";
import { productPriceConImpuesto } from "@/lib/pricing";

interface ProductCardProps {
  product: ProductType;
  onClick: (product: ProductType) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  // Se muestra a 40 px: la variante de 128 cubre pantallas de alta densidad
  // y pesa ~2.5 KB en lugar de los ~75 KB del original.
  const imageUrl = urlImagen(product.images?.[0]?.url, 128);
  // Stock de la farmacia de la caja (o de la bodega en modo legacy). Los avisos solo aplican
  // por farmacia: en legacy se ve el número de siempre, sin colores nuevos.
  const stock = localStock(product);
  const porFarmacia = isPerPharmacy(product);
  const minimo = localMinStock(product);
  const sinStock = porFarmacia && stock <= 0;
  const bajoMinimo = porFarmacia && minimo !== null && stock < minimo;

  return (
    <Card
      className="flex h-full cursor-pointer flex-col p-4 transition-shadow hover:shadow-md"
      onClick={() => onClick(product)}
    >
      <div className="flex items-start justify-between">
        {imageUrl ? (
          // `lazy` es lo que evita que abrir el POS dispare una petición por
          // cada producto del catálogo: solo cargan las tarjetas visibles. Por
          // eso tampoco hay spinner propio — una imagen fuera de pantalla no
          // carga nunca, y el spinner giraría para siempre. El hueco lo ocupa
          // el bg-muted hasta que la imagen pinta.
          <img
            src={imageUrl}
            alt={product.productName}
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            className="h-10 w-10 rounded bg-muted object-cover"
          />
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
        {/* Con la tasa aplicada, para que coincida con lo que entra al carrito. */}
        <span className="text-lg font-bold text-primary">
          ${productPriceConImpuesto(product, "regular").toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground text-right">
          {product.category?.categoryName}
        </span>
        <span className={`col-span-2 text-xs ${sinStock ? "font-medium text-destructive" : bajoMinimo ? "font-medium text-amber-600" : "text-muted-foreground"}`}>
          Stock: {stock}
          {sinStock && " · sin stock en esta farmacia"}
          {!sinStock && bajoMinimo && " · bajo mínimo"}
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
