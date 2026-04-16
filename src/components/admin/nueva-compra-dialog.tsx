"use client";

import { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Paperclip, X } from "lucide-react";
import { ProductType } from "@/types/product";
import { ProveedorType } from "@/types/proveedor";
import { CompraItem } from "@/types/compra";
import { useGetProveedores } from "@/api/getProveedores";
import { postProveedor } from "@/api/postProveedor";
import { postUpload } from "@/api/postUpload";
import { postCompra } from "@/api/postCompra";
import { patchProductStock } from "@/api/patchProductStock";
import { getUser } from "@/lib/auth";

interface NuevaCompraDialogProps {
  open: boolean;
  onClose: () => void;
  products: ProductType[];
  onCompraComplete: (items: { productId: number; quantity: number }[]) => void;
}

type Step = "proveedor" | "items" | "confirm";

interface LocalItem extends CompraItem {
  productId: number | null; // numeric id para buscar en el array local
}

export function NuevaCompraDialog({
  open,
  onClose,
  products,
  onCompraComplete,
}: NuevaCompraDialogProps) {
  const { result: proveedores, loading: loadingProveedores } = useGetProveedores();

  // ─── Step state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("proveedor");

  // ─── Step 1 state ─────────────────────────────────────────────────────────
  const [proveedorDocId, setProveedorDocId] = useState<string>("");
  const [localProveedores, setLocalProveedores] = useState<ProveedorType[]>([]);
  const [showNewProveedor, setShowNewProveedor] = useState(false);
  const [newProvName, setNewProvName] = useState("");
  const [newProvTel, setNewProvTel] = useState("");
  const [newProvEmail, setNewProvEmail] = useState("");
  const [creatingProv, setCreatingProv] = useState(false);
  const [provError, setProvError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [notas, setNotas] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Step 2 state ─────────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<LocalItem[]>([]);

  // ─── Step 3 state ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const allProveedores = useMemo(
    () => [...proveedores, ...localProveedores],
    [proveedores, localProveedores]
  );

  const selectedProveedor = allProveedores.find((p) => p.documentId === proveedorDocId) ?? null;

  const total = items.reduce((sum, i) => sum + i.totalLine, 0);

  const productSearchResults = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products
      .filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          (p.sal ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, productSearch]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function resetDialog() {
    setStep("proveedor");
    setProveedorDocId("");
    setLocalProveedores([]);
    setShowNewProveedor(false);
    setNewProvName("");
    setNewProvTel("");
    setNewProvEmail("");
    setCreatingProv(false);
    setProvError(null);
    setFile(null);
    setNotas("");
    setProductSearch("");
    setItems([]);
    setLoading(false);
    setError(null);
  }

  function handleClose() {
    resetDialog();
    onClose();
  }

  async function handleCreateProveedor() {
    if (!newProvName.trim()) return;
    setCreatingProv(true);
    setProvError(null);
    try {
      const created = await postProveedor({
        name: newProvName.trim(),
        ...(newProvTel.trim() ? { contactoTelefono: newProvTel.trim() } : {}),
        ...(newProvEmail.trim() ? { contactoEmail: newProvEmail.trim() } : {}),
      });
      setLocalProveedores((prev) => [...prev, created]);
      setProveedorDocId(created.documentId);
      setShowNewProveedor(false);
      setNewProvName("");
      setNewProvTel("");
      setNewProvEmail("");
    } catch (err) {
      setProvError(err instanceof Error ? err.message : "Error al crear proveedor");
    } finally {
      setCreatingProv(false);
    }
  }

  function handleAddProduct(product: ProductType) {
    setProductSearch("");
    const existing = items.findIndex((i) => i.productId === product.id);
    if (existing !== -1) {
      setItems((prev) =>
        prev.map((item, idx) => {
          if (idx !== existing) return item;
          const quantity = item.quantity + 1;
          return { ...item, quantity, totalLine: quantity * item.costoUnitario };
        })
      );
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        product: product.documentId,
        productName: product.productName,
        quantity: 1,
        costoUnitario: 0,
        totalLine: 0,
      },
    ]);
  }

  function handleItemQty(idx: number, value: string) {
    const quantity = Math.max(1, parseInt(value) || 1);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return { ...item, quantity, totalLine: quantity * item.costoUnitario };
      })
    );
  }

  // TODO: restaurar handleItemCosto cuando se habiliten costos

  function handleRemoveItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const operador = getUser()?.username ?? "";

      // 1. Subir archivo si hay uno
      let uploadId: number | undefined;
      if (file) {
        uploadId = await postUpload(file);
      }

      // 2. Crear la compra en Strapi
      await postCompra(
        {
          fecha: new Date().toISOString(),
          total,
          operador,
          estado: "registrada",
          ...(notas.trim() ? { notas: notas.trim() } : {}),
          ...(proveedorDocId ? { proveedor: proveedorDocId } : {}),
          items: items.map(({ productId: _pid, ...rest }) => rest),
        },
        uploadId
      );

      // 3. Actualizar stock de cada producto comprado
      const updatedItems: { productId: number; quantity: number }[] = [];
      for (const item of items) {
        if (!item.productId) continue;
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;
        await patchProductStock(
          product.documentId,
          product.stock_central + item.quantity
        );
        updatedItems.push({ productId: item.productId, quantity: item.quantity });
      }

      // 4. Actualizar state local
      onCompraComplete(updatedItems);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la compra");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Nueva Compra</DialogTitle>
        </DialogHeader>

        {/* ── Paso 1: Proveedor y archivo ──────────────────────────────────── */}
        {step === "proveedor" && (
          <>
            <div className="space-y-4">
              {/* Proveedor select */}
              <div className="space-y-1.5">
                <Label>Proveedor</Label>
                {loadingProveedores ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                  </div>
                ) : (
                  <Select value={proveedorDocId} onValueChange={setProveedorDocId}>
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

                {/* Botón nuevo proveedor */}
                {!showNewProveedor && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setShowNewProveedor(true)}
                  >
                    + Crear nuevo proveedor
                  </button>
                )}
              </div>

              {/* Mini formulario nuevo proveedor */}
              {showNewProveedor && (
                <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                  <p className="text-sm font-medium">Nuevo proveedor</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="prov-name">Nombre *</Label>
                    <Input
                      id="prov-name"
                      value={newProvName}
                      onChange={(e) => setNewProvName(e.target.value)}
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="prov-tel">Teléfono</Label>
                      <Input
                        id="prov-tel"
                        value={newProvTel}
                        onChange={(e) => setNewProvTel(e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="prov-email">Email</Label>
                      <Input
                        id="prov-email"
                        type="email"
                        value={newProvEmail}
                        onChange={(e) => setNewProvEmail(e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  {provError && <p className="text-xs text-destructive">{provError}</p>}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowNewProveedor(false); setProvError(null); }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateProveedor}
                      disabled={!newProvName.trim() || creatingProv}
                    >
                      {creatingProv && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}

              {/* Archivo */}
              <div className="space-y-1.5">
                <Label>Factura (opcional)</Label>
                {file ? (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
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
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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

              {/* Notas */}
              <div className="space-y-1.5">
                <Label htmlFor="notas">Notas (opcional)</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones sobre esta compra..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => setStep("items")}>
                Siguiente
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Paso 2: Items ─────────────────────────────────────────────────── */}
        {step === "items" && (
          <>
            <div className="space-y-3">
              {/* Buscador */}
              <div className="relative">
                <Input
                  placeholder="Buscar producto por nombre o sal..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  autoFocus
                />
                {productSearchResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 rounded-lg border bg-background shadow-md max-h-48 overflow-y-auto">
                    {productSearchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full min-w-0 px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between gap-2"
                        onClick={() => handleAddProduct(p)}
                      >
                        <span className="flex-1 truncate">{p.productName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          Stock: {p.stock_central}
                        </span>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de items */}
              {items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Busca y agrega productos a esta compra
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border px-3 py-2 space-y-1.5"
                    >
                      {/* Fila 1: nombre + botón eliminar */}
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="flex-1 truncate text-sm font-medium">{item.productName}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Fila 2: controles */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Cant</span>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleItemQty(idx, e.target.value)}
                            className="h-7 w-16 text-center text-sm"
                          />
                        </div>
                        {/* TODO: restaurar costo unitario y total cuando se habiliten costos */}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TODO: restaurar total general cuando se habiliten costos */}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("proveedor")}>Atrás</Button>
              <Button onClick={() => setStep("confirm")} disabled={items.length === 0}>
                Siguiente
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Paso 3: Confirmación ──────────────────────────────────────────── */}
        {step === "confirm" && (
          <>
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Proveedor</span>
                  <p className="font-medium">{selectedProveedor?.name ?? "Sin especificar"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Factura</span>
                  <p className="font-medium">{file ? file.name : "Sin adjunto"}</p>
                </div>
                {notas && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Notas</span>
                    <p className="font-medium">{notas}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="divide-y rounded-lg border text-sm max-h-56 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 gap-2">
                    <span className="truncate flex-1 font-medium">{item.productName}</span>
                    <Badge variant="outline" className="text-xs shrink-0">x{item.quantity}</Badge>
                  </div>
                ))}
              </div>
              {/* TODO: restaurar total cuando se habiliten costos */}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("items")} disabled={loading}>
                Atrás
              </Button>
              <Button onClick={handleConfirm} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar compra
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
