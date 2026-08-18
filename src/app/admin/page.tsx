import { redirect } from "next/navigation";

/**
 * `/admin` no tiene contenido propio: el dashboard vive en su propia ruta, como el resto
 * de las páginas del panel. Esto mantiene vivos los enlaces y marcadores a `/admin`.
 */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
