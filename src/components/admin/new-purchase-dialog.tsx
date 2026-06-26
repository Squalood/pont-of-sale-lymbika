"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductType } from "@/types/product";
import { ProveedorType } from "@/types/proveedor";
import { useGetProveedores } from "@/api/getProveedores";
import { postUpload } from "@/api/postUpload";
import { postCompra } from "@/api/postCompra";
import { patchProductStock } from "@/api/patchProductStock";
import { patchProductMemberPrice } from "@/api/patchProductMemberPrice";
import { getUser } from "@/lib/auth";
import { LocalItem } from "./purchase/types";
import { SupplierStep } from "./purchase/supplier-step";
import { ItemsStep } from "./purchase/items-step";
import { ConfirmStep } from "./purchase/confirm-step";

interface NewPurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  products: ProductType[];
  onCompraComplete: (items: { productId: number; quantity: number }[]) => void;
}

type Step = "proveedor" | "items" | "confirm";

export function NewPurchaseDialog({
  open,
  onClose,
  products,
  onCompraComplete,
}: NewPurchaseDialogProps) {
  const { result: proveedores, loading: loadingProveedores } = useGetProveedores();

  const [step, setStep] = useState<Step>("proveedor");

  // Shared state across steps
  const [proveedorDocId, setProveedorDocId] = useState<string>("");
  const [localProveedores, setLocalProveedores] = useState<ProveedorType[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<LocalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allProveedores = useMemo(
    () => [...proveedores, ...localProveedores],
    [proveedores, localProveedores]
  );

  const selectedProveedor = allProveedores.find((p) => p.documentId === proveedorDocId) ?? null;

  const total = items.reduce((sum, i) => sum + i.totalLine, 0);

  function resetDialog() {
    setStep("proveedor");
    setProveedorDocId("");
    setLocalProveedores([]);
    setFile(null);
    setNotas("");
    setItems([]);
    setLoading(false);
    setError(null);
  }

  function handleClose() {
    resetDialog();
    onClose();
  }

  function handleAddProduct(product: ProductType) {
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
    const costoUnitario = product.priceMember ?? 0;
    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        product: product.documentId,
        productName: product.productName,
        quantity: 1,
        costoUnitario,
        totalLine: costoUnitario,
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

  function handleItemCosto(idx: number, value: string) {
    const costoUnitario = Math.max(0, parseFloat(value) || 0);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return { ...item, costoUnitario, totalLine: item.quantity * costoUnitario };
      })
    );
  }

  function handleRemoveItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const operador = getUser()?.username ?? "";

      let uploadId: number | undefined;
      if (file) {
        uploadId = await postUpload(file);
      }

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

      const updatedItems: { productId: number; quantity: number }[] = [];
      for (const item of items) {
        if (!item.productId) continue;
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;
        await patchProductStock(
          product.documentId,
          product.stock_central + item.quantity
        );
        if (item.costoUnitario > 0) {
          await patchProductMemberPrice(product.documentId, item.costoUnitario);
        }
        updatedItems.push({ productId: item.productId, quantity: item.quantity });
      }

      onCompraComplete(updatedItems);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la compra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Nueva Compra</DialogTitle>
        </DialogHeader>

        {step === "proveedor" && (
          <SupplierStep
            allProveedores={allProveedores}
            loadingProveedores={loadingProveedores}
            proveedorDocId={proveedorDocId}
            onProveedorChange={setProveedorDocId}
            onProveedorCreated={(p) => {
              setLocalProveedores((prev) => [...prev, p]);
              setProveedorDocId(p.documentId);
            }}
            file={file}
            onFileChange={setFile}
            notas={notas}
            onNotasChange={setNotas}
            onNext={() => setStep("items")}
            onClose={handleClose}
          />
        )}

        {step === "items" && (
          <ItemsStep
            products={products}
            items={items}
            onAddProduct={handleAddProduct}
            onChangeQty={handleItemQty}
            onChangeCosto={handleItemCosto}
            onRemoveItem={handleRemoveItem}
            onNext={() => setStep("confirm")}
            onBack={() => setStep("proveedor")}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            selectedProveedor={selectedProveedor}
            file={file}
            notas={notas}
            items={items}
            total={total}
            loading={loading}
            error={error}
            onConfirm={handleConfirm}
            onBack={() => setStep("items")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
