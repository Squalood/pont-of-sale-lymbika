"use client";

import {
  Baby,
  HeartPulse,
  Package,
  Pill,
  Sparkles,
  Stethoscope,
  Store,
  Syringe,
  Tablets,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { CategoryIcon, CategoryType } from "@/types/category";
import { ProductType } from "@/types/product";

/**
 * Enum `icon` de Strapi resuelto a componente. Se enumeran uno a uno a
 * propósito: importar lucide por nombre dinámico arrastraría el paquete entero
 * al bundle en vez de estos seis iconos.
 */
const ICONOS: Record<CategoryIcon, LucideIcon> = {
  Tablets,
  HeartPulse,
  Syringe,
  Baby,
  Pill,
  Sparkles,
};

/** Categorías sin `icon` capturado en Strapi (hoy 3 de 9). */
const ICONO_POR_DEFECTO = Package;

/**
 * `dragFree` para poder arrastrar el carril con el dedo sin que encaje en
 * posiciones fijas, y `slidesToScroll: "auto"` para que las flechas avancen lo
 * que quepa a la vista en vez de un chip cada vez.
 */
const OPCIONES_CARRUSEL = {
  align: "start",
  dragFree: true,
  slidesToScroll: "auto",
  containScroll: "trimSnaps",
} as const;

/** `disabled:hidden`: embla deshabilita la flecha al llegar al extremo. */
const CLASE_FLECHA =
  "size-7 border-none bg-sidebar shadow-none hover:bg-secondary disabled:hidden";

interface CategoryFilterProps {
  categories: CategoryType[];
  products: ProductType[];
  serviceRateCount?: number;
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilter({ categories, products, serviceRateCount, selected, onSelect }: CategoryFilterProps) {
  const totalCount = products.length + (serviceRateCount ?? 0);

  function chipClass(activo: boolean) {
    return activo
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "text-muted-foreground hover:bg-secondary";
  }

  return (
    // Una sola fila que se desplaza: con 11 categorías, envolver ocupaba tres
    // renglones de la cabecera y comía sitio a las tarjetas.
    <Carousel opts={OPCIONES_CARRUSEL} className="w-full">
      {/* -ml-2 / pl-2 sustituyen al hueco de 16 px que trae el componente, que
          para chips es demasiado aire. */}
      <CarouselContent className="-ml-2">
        <CarouselItem className="basis-auto pl-2">
          <Button
            variant={selected === "todos" ? "default" : "ghost"}
            size="sm"
            onClick={() => onSelect("todos")}
            className={chipClass(selected === "todos")}
          >
            <Store className="h-3.5 w-3.5" />
            Todos
            <span className="ml-1 rounded-full bg-black/10 px-1.5 text-xs">{totalCount}</span>
          </Button>
        </CarouselItem>

        {/* Consultas va segunda, no al final: es el único chip que no es una
            categoría de producto y al final quedaba fuera de la vista. */}
        {serviceRateCount !== undefined && (
          <CarouselItem className="basis-auto pl-2">
            <Button
              variant={selected === "consultas" ? "default" : "ghost"}
              size="sm"
              onClick={() => onSelect("consultas")}
              className={chipClass(selected === "consultas")}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Consultas
              <span className="ml-1 rounded-full bg-black/10 px-1.5 text-xs">{serviceRateCount}</span>
            </Button>
          </CarouselItem>
        )}

        {categories.map((cat) => {
          const Icono = (cat.icon && ICONOS[cat.icon]) || ICONO_POR_DEFECTO;
          return (
            <CarouselItem key={cat.id} className="basis-auto pl-2">
              <Button
                variant={selected === cat.slug ? "default" : "ghost"}
                size="sm"
                onClick={() => onSelect(cat.slug)}
                className={chipClass(selected === cat.slug)}
              >
                <Icono className="h-3.5 w-3.5" />
                {cat.categoryName}
                <span className="ml-1 rounded-full bg-black/10 px-1.5 text-xs">
                  {products.filter((p) => p.category?.slug === cat.slug).length}
                </span>
              </Button>
            </CarouselItem>
          );
        })}
      </CarouselContent>

      {/* Pegadas a los bordes: el componente las pone por defecto a -48 px,
          fuera del sidebar, donde quedarían recortadas. */}
      <CarouselPrevious className={`left-0 ${CLASE_FLECHA}`} />
      <CarouselNext className={`right-0 ${CLASE_FLECHA}`} />
    </Carousel>
  );
}
