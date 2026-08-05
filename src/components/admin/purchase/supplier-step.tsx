"use client";

import { useState, useRef } from "react";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Paperclip, X } from "lucide-react";
import { ProveedorType } from "@/types/proveedor";
import { NewSupplierForm } from "./new-supplier-form";

interface SupplierStepProps {
  allProveedores: ProveedorType[];
  loadingProveedores: boolean;
  proveedorDocId: string;
  onProveedorChange: (id: string) => void;
  onProveedorCreated: (proveedor: ProveedorType) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  notas: string;
  onNotasChange: (n: string) => void;
  onNext: () => void;
  onClose: () => void;
}

export function SupplierStep({
  allProveedores,
  loadingProveedores,
  proveedorDocId,
  onProveedorChange,
  onProveedorCreated,
  file,
  onFileChange,
  notas,
  onNotasChange,
  onNext,
  onClose,
}: SupplierStepProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCreated(proveedor: ProveedorType) {
    onProveedorCreated(proveedor);
    setShowNewForm(false);
  }

  return (
    <>
      <div className="min-w-0 space-y-4">
        <div className="space-y-1.5">
          <Label>Proveedor</Label>
          {loadingProveedores ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : (
            <Select value={proveedorDocId} onValueChange={onProveedorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor..." />
              </SelectTrigger>
              <SelectContent>
                {allProveedores.map((p) => (
                  <SelectItem key={p.documentId} value={p.documentId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!showNewForm && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setShowNewForm(true)}
            >
              + Crear nuevo proveedor
            </button>
          )}
        </div>

        {showNewForm && (
          <NewSupplierForm
            onCreated={handleCreated}
            onCancel={() => setShowNewForm(false)}
          />
        )}

        <div className="space-y-1.5">
          <Label>Factura (opcional)</Label>
          {file ? (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => {
                  onFileChange(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="mr-1.5 h-4 w-4" />
                Adjuntar factura
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Textarea
            id="notas"
            value={notas}
            onChange={(e) => onNotasChange(e.target.value)}
            placeholder="Observaciones sobre esta compra..."
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={onNext}>Siguiente</Button>
      </DialogFooter>
    </>
  );
}
