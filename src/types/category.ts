/**
 * Valores del enum `icon` en Strapi. Cada uno es el nombre de un icono de
 * lucide-react; el mapa que los resuelve vive en `category-filter.tsx`, con una
 * entrada por valor para no arrastrar el paquete entero al bundle.
 */
export type CategoryIcon =
  | "Tablets"
  | "HeartPulse"
  | "Syringe"
  | "Baby"
  | "Pill"
  | "Sparkles";

export type CategoryType = {
    id: number;
    categoryName: string;
    slug: string;
    mainImage: {
        url: string;
    };
    description: string;
    /** Sin capturar en varias categorías: la UI cae a un icono neutro. */
    icon?: CategoryIcon | null;
};