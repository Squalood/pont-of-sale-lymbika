import type { NextRequest } from "next/server";

/**
 * Descarga un adjunto del CDN a través del servidor.
 *
 * El media se sirve desde CloudFront, que no manda cabeceras CORS, así que el
 * navegador no puede hacerle fetch desde otro origen. Cloudinary sí las
 * mandaba, y por eso la descarga directa funcionaba antes de la migración.
 *
 * Pedirlo desde el servidor evita CORS por completo y permite conservar el
 * nombre original del archivo, que es lo que se pierde con un enlace directo.
 *
 * La alternativa de fondo es adjuntar la política SimpleCORS a la distribución
 * de CloudFront; entonces esta ruta se podría quitar.
 */

/** Sólo se permite descargar del CDN: un proxy abierto sería un SSRF. */
const HOSTS_PERMITIDOS = [".cloudfront.net"];

/** Content-Disposition no admite saltos de línea ni comillas sin escapar. */
function cabeceraNombre(nombre: string): string {
  const limpio = nombre.replace(/[\r\n"]/g, "").trim() || "archivo";
  const ascii = limpio.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(limpio)}`;
}

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const origen = parametros.get("url");
  const nombre = parametros.get("nombre") ?? "archivo";

  if (!origen) {
    return new Response("Falta el parámetro url", { status: 400 });
  }

  let destino: URL;
  try {
    destino = new URL(origen);
  } catch {
    return new Response("La url no es válida", { status: 400 });
  }

  if (destino.protocol !== "https:" || !HOSTS_PERMITIDOS.some((h) => destino.host.endsWith(h))) {
    return new Response("Sólo se pueden descargar archivos del CDN", { status: 403 });
  }

  const respuesta = await fetch(destino, { cache: "no-store" });
  if (!respuesta.ok || !respuesta.body) {
    return new Response("No se pudo obtener el archivo", { status: 502 });
  }

  const cabeceras = new Headers({
    "Content-Type": respuesta.headers.get("content-type") ?? "application/octet-stream",
    "Content-Disposition": cabeceraNombre(nombre),
    "Cache-Control": "private, max-age=0, no-store",
  });
  const largo = respuesta.headers.get("content-length");
  if (largo) cabeceras.set("Content-Length", largo);

  return new Response(respuesta.body, { headers: cabeceras });
}
