/**
 * URLs de imagen del catálogo.
 *
 * El media vive en S3 servido por CloudFront, que no transforma nada: cada
 * ancho existe como objeto ya subido, con el nombre
 * <clave sin extensión>_w<ancho>.webp.
 *
 * Importa pedir el ancho correcto. Las tarjetas y tablas del POS muestran las
 * imágenes a 36-40 px, y servir el original significa descargar 75 KB de media
 * (hasta 3.3 MB en las peores) para pintar un cuadrito. La variante w128 pesa
 * unos 2.5 KB y cubre pantallas de alta densidad de sobra.
 */

/** Anchos disponibles en el bucket. Pedir otro devuelve un 404. */
export const ANCHOS = [128, 384, 640, 1080, 1920] as const;
export type Ancho = (typeof ANCHOS)[number];

/** Formatos para los que se generaron variantes. */
const CON_VARIANTES = /\.(png|jpe?g|webp|avif|tiff)$/i;

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

/**
 * Variante del ancho pedido, si la hay. Devuelve la url intacta cuando no
 * aplica: rutas locales, svg, pdf, o media servida desde otro sitio.
 */
export function urlImagen(url: string | null | undefined, ancho: Ancho): string | undefined {
  if (!url) return undefined;
  if (!url.startsWith("http")) return `${BACKEND}${url}`;
  if (!url.includes(".cloudfront.net/")) return url;
  if (!CON_VARIANTES.test(url)) return url;
  return url.replace(/\.[^./]+$/, `_w${ancho}.webp`);
}

/**
 * Archivo original, para descargas y adjuntos. Nunca una variante: el usuario
 * espera el documento que se subió, no una versión reducida.
 */
export function urlOriginal(url: string): string {
  return url.startsWith("http") ? url : `${BACKEND}${url}`;
}
