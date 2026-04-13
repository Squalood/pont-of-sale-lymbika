import { getToken } from "@/lib/auth";

// No usa authFetch porque authFetch inyecta Content-Type: application/json,
// lo que rompe los uploads multipart (el browser no puede agregar el boundary).
// En su lugar se usa fetch nativo con solo el header de Authorization.
export async function postUpload(file: File): Promise<number> {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`;
  const token = getToken();

  const formData = new FormData();
  formData.append("files", file);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `Error al subir archivo (${res.status})`
    );
  }

  const json = await res.json();
  // Strapi upload retorna un array
  return json[0].id as number;
}
