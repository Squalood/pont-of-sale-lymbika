"use client";

import { Button } from "@/components/ui/button";
import { CategoryType } from "@/types/category";
import { ProductType } from "@/types/product";

interface CategoryFilterProps {
  categories: CategoryType[];
  products: ProductType[];
  serviceRateCount?: number;
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilter({ categories, products, serviceRateCount, selected, onSelect }: CategoryFilterProps) {
  const totalCount = products.length + (serviceRateCount ?? 0);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selected === "todos" ? "default" : "ghost"}
        size="sm"
        onClick={() => onSelect("todos")}
        className={
          selected === "todos"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "text-muted-foreground hover:bg-secondary"
        }
      >
        🏪 Todos
        <span className="ml-1 rounded-full bg-black/10 px-1.5 text-xs">{totalCount}</span>
      </Button>
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant={selected === cat.slug ? "default" : "ghost"}
          size="sm"
          onClick={() => onSelect(cat.slug)}
          className={
            selected === cat.slug
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "text-muted-foreground hover:bg-secondary"
          }
        >
          {cat.categoryName}
          <span className="ml-1 rounded-full bg-black/10 px-1.5 text-xs">
            {products.filter((p) => p.category?.slug === cat.slug).length}
          </span>
        </Button>
      ))}
      {serviceRateCount !== undefined && (
        <Button
          variant={selected === "consultas" ? "default" : "ghost"}
          size="sm"
          onClick={() => onSelect("consultas")}
          className={
            selected === "consultas"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "text-muted-foreground hover:bg-secondary"
          }
        >
          🩺 Consultas
          <span className="ml-1 rounded-full bg-black/10 px-1.5 text-xs">{serviceRateCount}</span>
        </Button>
      )}
    </div>
  );
}
