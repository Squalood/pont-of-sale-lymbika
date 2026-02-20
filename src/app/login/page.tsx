"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/local`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || "Credenciales incorrectas.");
        return;
      }

      saveAuth(data.jwt, data.user);
      router.push("/");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.svg" alt="Logo" className="h-14 w-14 rounded-2xl" />
          <div className="text-center">
            <h1 className="text-2xl font-bold">Punto de Venta</h1>
            <p className="text-sm text-muted-foreground">Inicia sesión para continuar</p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-white p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Correo o usuario</label>
            <Input
              type="text"
              placeholder="usuario@farmacia.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Contraseña</label>
            <Input
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
