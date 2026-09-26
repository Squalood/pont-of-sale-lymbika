"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductType } from "@/types/product";
import { ProveedorType } from "@/types/proveedor";
import { CompraItem } from "@/types/compra";
import { useGetProveedores } from "@/api/getProveedores";
import { postUpload } from "@/api/postUpload";
import { postCompra } from "@/api/postCompra";
import { patchProduct } from "@/api/patchProduct";
import { postLote } from "@/api/postLote";
import { getUser } from "@/lib/auth";
import { LocalPurchaseItem, LoteRow } from "./purchase/types";
import {
  itemQuantity,
  itemCostoParaCatalogo,
  loteTotalLine,
  comprasTotal,
  ivaToImpuestoProducto,
  ivaDesdeProducto,
} from "./purchase/helpers";
import { SupplierStep } from "./purchase/supplier-step";
import { ItemsStep } from "./purchase/items-step";
import { ConfirmStep } from "./purchase/confirm-step";

interface NewPurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  onCompraComplete: () => void;
}

type Step = "proveedor" | "items" | "confirm";

export function NewPurchaseDialog({
  open,
  onClose,
  onCompraComplete,
}: NewPurchaseDialogProps) {
  const { result: proveedores, loading: loadingProveedores } = useGetProveedores();

  const [step, setStep] = useState<Step>("proveedor");

  // Shared state across steps
  const [proveedorDocId, setProveedorDocId] = useState<string>("");
  const [localProveedores, setLocalProveedores] = useState<ProveedorType[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<LocalPurchaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allProveedores = useMemo(
    () => [...proveedores, ...localProveedores],
    [proveedores, localProveedores]
  );

  const selectedProveedor = allProveedores.find((p) => p.documentId === proveedorDocId) ?? null;

  const total = comprasTotal(items);

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

  function updateItem(idx: number, patch: Partial<LocalPurchaseItem>) {
    setItems((prev) => prev.map((item, i) => (i !== idx ? item : { ...item, ...patch })));
  }

  /**
   * Renglón en blanco para un producto. Hereda el costo del último renglón porque lo
   * habitual es que los lotes de una misma compra lleguen al mismo precio; cuando el
   * proveedor factura distinto, se corrige solo ese renglón.
   */
  function nuevoLote(lotes: LoteRow[]): LoteRow {
    return { numeroLote: "", cantidad: 1, costoUnitario: lotes.at(-1)?.costoUnitario ?? 0 };
  }

  // Agrega el producto (con 1 renglón de lote vacío). Si ya existe, agrega otro renglón.
  function handleAddProduct(product: ProductType) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx !== -1) {
        return prev.map((item, i) =>
          i !== idx ? item : { ...item, lotes: [...item.lotes, nuevoLote(item.lotes)] }
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          product: product.documentId,
          productName: product.productName,
          stockActual: product.stock_central ?? 0,
          // Arranca con la tasa que el producto ya tiene: al confirmar se sobrescribe
          // el `impuesto` del producto, así que un valor fijo aquí la borraría.
          iva: ivaDesdeProducto(product),
          lotes: [{ numeroLote: "", cantidad: 1, costoUnitario: product.priceMember ?? 0 }],
        },
      ];
    });
  }

  function handleChangeIva(idx: number, value: "iva8" | "iva16" | "exento") {
    updateItem(idx, { iva: value });
  }

  function handleAddLote(idx: number) {
    setItems((prev) =>
      prev.map((item, i) => (i !== idx ? item : { ...item, lotes: [...item.lotes, nuevoLote(item.lotes)] }))
    );
  }

  // Quita un renglón; si era el último del producto, quita el producto.
  function handleRemoveLote(itemIdx: number, loteIdx: number) {
    setItems((prev) =>
      prev.flatMap((item, i) => {
        if (i !== itemIdx) return [item];
        const lotes = item.lotes.filter((_, li) => li !== loteIdx);
        return lotes.length === 0 ? [] : [{ ...item, lotes }];
      })
    );
  }

  function updateLote(itemIdx: number, loteIdx: number, patch: Partial<LocalPurchaseItem["lotes"][number]>) {
    setItems((prev) =>
      prev.map((item, i) =>
        i !== itemIdx
          ? item
          : { ...item, lotes: item.lotes.map((l, li) => (li !== loteIdx ? l : { ...l, ...patch })) }
      )
    );
  }

  function handleChangeLoteNumero(itemIdx: number, loteIdx: number, value: string) {
    updateLote(itemIdx, loteIdx, { numeroLote: value });
  }

  function handleChangeLoteCantidad(itemIdx: number, loteIdx: number, value: string) {
    updateLote(itemIdx, loteIdx, { cantidad: Math.max(1, parseInt(value) || 1) });
  }

  function handleChangeLoteCosto(itemIdx: number, loteIdx: number, value: string) {
    updateLote(itemIdx, loteIdx, { costoUnitario: Math.max(0, parseFloat(value) || 0) });
  }

  // Vaciar el campo devuelve el costo del catalogo a automatico (el mas alto).
  function handleChangeCostoCatalogo(idx: number, value: string) {
    const costoCatalogo = value.trim() === "" ? undefined : Math.max(0, parseFloat(value) || 0);
    updateItem(idx, { costoCatalogo });
  }

  function handleResetCostoCatalogo(idx: number) {
    updateItem(idx, { costoCatalogo: undefined });
  }

  function handleChangeLoteCaducidad(itemIdx: number, loteIdx: number, value: string) {
    updateLote(itemIdx, loteIdx, { fechaCaducidad: value || undefined });
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

      // Aplanar: un CompraItem por renglón de lote.
      const compraItems: CompraItem[] = items.flatMap((item) =>
        item.lotes.map((lote) => ({
          product: item.product,
          productName: item.productName,
          quantity: lote.cantidad,
          costoUnitario: lote.costoUnitario,
          iva: item.iva,
          totalLine: loteTotalLine(lote, item.iva),
          ...(lote.numeroLote.trim() ? { numeroLote: lote.numeroLote.trim() } : {}),
          ...(lote.fechaCaducidad ? { fechaCaducidad: lote.fechaCaducidad } : {}),
        }))
      );

      const compraDocId = await postCompra(
        {
          fecha: new Date().toISOString(),
          total,
          operador,
          estado: "registrada",
          ...(notas.trim() ? { notas: notas.trim() } : {}),
          ...(proveedorDocId ? { proveedor: proveedorDocId } : {}),
          items: compraItems,
        },
        uploadId
      );

      const updatedItems: { productId: number; quantity: number }[] = [];
      for (const item of items) {
        const totalQty = itemQuantity(item);

        // Un solo PUT por producto: stock, costo y tasa de IVA quedan en la misma escritura.
        // El costo solo se manda si se capturó; la tasa siempre, y sobrescribe la que hubiera.
        const costoCatalogo = itemCostoParaCatalogo(item);
        await patchProduct(item.product, {
          stock_central: item.stockActual + totalQty,
          ...(costoCatalogo > 0 ? { priceMember: costoCatalogo } : {}),
          impuesto: ivaToImpuestoProducto(item.iva),
        });
        // Un inventory-lot por cada renglón que traiga número de lote.
        for (const lote of item.lotes) {
          if (!lote.numeroLote.trim()) continue;
          await postLote({
            product: item.product,
            numeroLote: lote.numeroLote.trim(),
            fechaCaducidad: lote.fechaCaducidad,
            cantidadInicial: lote.cantidad,
            compraDocId,
          });
        }
        updatedItems.push({ productId: item.productId, quantity: totalQty });
      }

      const totalUnidades = updatedItems.reduce((sum, i) => sum + i.quantity, 0);
      const lotesCreados = items.reduce(
        (sum, i) => sum + i.lotes.filter((l) => l.numeroLote.trim()).length,
        0
      );
      toast.success("Compra registrada", {
        description: `${updatedItems.length} producto(s) · ${totalUnidades} unidad(es)` +
          (lotesCreados > 0 ? ` · ${lotesCreados} lote(s)` : ""),
      });

      onCompraComplete();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la compra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="grid-cols-[minmax(0,1fr)] sm:max-w-xl"
        aria-describedby={undefined}
      >
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
            items={items}
            onAddProduct={handleAddProduct}
            onChangeLoteCosto={handleChangeLoteCosto}
            onChangeCostoCatalogo={handleChangeCostoCatalogo}
            onResetCostoCatalogo={handleResetCostoCatalogo}
            onChangeIva={handleChangeIva}
            onAddLote={handleAddLote}
            onRemoveLote={handleRemoveLote}
            onChangeLoteNumero={handleChangeLoteNumero}
            onChangeLoteCantidad={handleChangeLoteCantidad}
            onChangeLoteCaducidad={handleChangeLoteCaducidad}
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
