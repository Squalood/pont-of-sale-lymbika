"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ProveedorType } from "@/types/proveedor";
import { postProveedor } from "@/api/postProveedor";

interface NewSupplierFormProps {
  onCreated: (proveedor: ProveedorType) => void;
  onCancel: () => void;
}

export function NewSupplierForm({ onCreated, onCancel }: NewSupplierFormProps) {
  const [name, setName] = useState("");
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await postProveedor({
        name: name.trim(),
        ...(tel.trim() ? { contactoTelefono: tel.trim() } : {}),
        ...(email.trim() ? { contactoEmail: email.trim() } : {}),
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear proveedor");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
      <p className="text-sm font-medium">Nuevo proveedor</p>
      <div className="space-y-1.5">
        <Label htmlFor="prov-name">Nombre *</Label>
        <Input
          id="prov-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del proveedor"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="prov-tel">Teléfono</Label>
          <Input
            id="prov-tel"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prov-email">Email</Label>
          <Input
            id="prov-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || creating}>
          {creating && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
