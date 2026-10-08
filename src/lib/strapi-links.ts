const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

/** Ficha del producto en el content manager de Strapi. */
export const strapiProductUrl = (documentId: string) =>
  `${BACKEND_URL}/admin/content-manager/collection-types/api::product.product/${documentId}`;

/** Ficha de la tarifa (service-rate): ahí se cambian precio, doctor y duración. */
export const strapiServiceRateUrl = (documentId: string) =>
  `${BACKEND_URL}/admin/content-manager/collection-types/api::service-rate.service-rate/${documentId}`;
