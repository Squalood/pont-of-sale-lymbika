"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductSidebar } from "@/components/product-sidebar";
import { CartPanel } from "@/components/cart-panel";
import { LoteSelectorDialog } from "@/components/lote-selector-dialog";
import { getSellableLots, toSelectedLot } from "@/lib/lotes";
import { InventoryLotOnProduct } from "@/types/product";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useGetProducts } from "@/api/getProducts";
import { useGetCategories } from "@/api/getCategories";
import { useGetServiceRates } from "@/api/getServiceRates";
import { ProductType, GridItem } from "@/types/product";

// Cada bloque contiene una sola variante de GridItem; el tipo estrecho es lo que
// deja ordenarlos con su comparador sin comprobar el discriminante en cada paso.
type ProductGridItem = Extract<GridItem, { type: "product" }>;
type ServiceGridItem = Extract<GridItem, { type: "service" }>;
import { Unauthorized } from "@/components/unauthorized";
import { useForbidden } from "@/lib/forbidden-context";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";
import { AperturaCajaDialog } from "@/components/apertura-caja-dialog";
import { ResumenCierreScreen } from "@/components/resumen-cierre-screen";
import { Loader2 } from "lucide-react";
import { useMultiCart, MAX_CARTS } from "@/hooks/useMultiCart";
import { normalize } from "@/lib/search";
import {
  compareProducts,
  compareServices,
  DEFAULT_SORT,
  gridMode,
  SIN_ORDEN,
  type SortState,
} from "@/lib/grid-sort";

export default function Home() {
  const router = useRouter();
  const { caja, loading: loadingCaja, refetch: refetchCaja, pharmacyId, setPharmacyId, cierreResumen } = useCaja();

  const { result: fetchedProducts, loading: loadingProducts, error: errorProducts } = useGetProducts();
  const { result: categories } = useGetCategories();
  const { result: serviceRates } = useGetServiceRates();
  const [products, setProducts] = useState<ProductType[]>([]);

  useEffect(() => { setProducts(fetchedProducts); }, [fetchedProducts]);

  const { setForbidden } = useForbidden();
  useEffect(() => { if (!getUser()) router.replace("/login"); }, [router]);
  useEffect(() => { if (errorProducts === "403") setForbidden(true); }, [errorProducts, setForbidden]);

  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [pendingLot, setPendingLot] = useState<{ cartId: number; product: ProductType } | null>(null);
  const [productSort, setProductSort] = useState<SortState>(DEFAULT_SORT);
  const [serviceSort, setServiceSort] = useState<SortState>(DEFAULT_SORT);

  // Elegir un orden apaga el del otro tipo. Sin esto quedaría un orden olvidado
  // que se reactivaría solo al volver a "Mezclado", cambiando la vista sin que
  // nadie lo haya pedido.
  function cambiarOrdenProductos(next: SortState) {
    setProductSort(next);
    if (next.field !== SIN_ORDEN) setServiceSort(DEFAULT_SORT);
  }

  function cambiarOrdenConsultas(next: SortState) {
    setServiceSort(next);
    if (next.field !== SIN_ORDEN) setProductSort(DEFAULT_SORT);
  }

  const {
    carts, activeCartId, setActiveCartId,
    sidebarOpen, setSidebarOpen, sidebarWidth,
    addToCartOf, updateQuantityOf, removeItemOf,
    updateItemPriceOf, updateItemImpuestoOf, clearCartOf, setPriceModeOf,
    addCart, removeCart, handleSaleComplete,
  } = useMultiCart(setProducts);

  // Índice de búsqueda del catálogo. Se construye sobre `fetchedProducts` y no
  // sobre `products`: vender solo cambia el stock, los nombres no, así que el
  // índice sobrevive a cada venta en lugar de rehacerse.
  const productSearchIndex = useMemo(() => {
    const index = new Map<number, { nombre: string; sal: string; barcode: string }>();
    for (const p of fetchedProducts) {
      index.set(p.id, {
        nombre: normalize(p.productName),
        sal: normalize(p.sal ?? ""),
        barcode: (p.barCode ?? "").toLowerCase(),
      });
    }
    return index;
  }, [fetchedProducts]);

  const serviceSearchIndex = useMemo(() => {
    const index = new Map<number, { nombre: string; doctor: string }>();
    for (const sr of serviceRates) {
      if (!sr.medical_service) continue;
      index.set(sr.id, {
        nombre: normalize(sr.medical_service.name),
        doctor: normalize(sr.doctor?.doctorName ?? ""),
      });
    }
    return index;
  }, [serviceRates]);

  const filteredItems = useMemo((): GridItem[] => {
    // Lo único que se normaliza por pulsación es el término tecleado.
    const term = normalize(search);
    const barcodeTerm = barcode.toLowerCase();

    const { soloProductos, soloConsultas } = gridMode(selectedCategory, productSort, serviceSort);

    const productItems: ProductGridItem[] = selectedCategory === "consultas" || soloConsultas
      ? []
      : products
          .filter((p) => {
            const idx = productSearchIndex.get(p.id);
            const matchesSearch =
              !term || !!idx && (idx.nombre.includes(term) || idx.sal.includes(term));
            const matchesBarcode =
              !barcodeTerm || !!idx && idx.barcode.includes(barcodeTerm);
            const matchesCategory =
              selectedCategory === "todos" || p.category?.slug === selectedCategory;
            return matchesSearch && matchesBarcode && matchesCategory;
          })
          .map((p) => ({ type: "product" as const, data: p }));

    if (soloProductos) {
      productItems.sort((a, b) => compareProducts(a.data, b.data, productSort));
    }

    const serviceItems: ServiceGridItem[] = !soloProductos && (selectedCategory === "todos" || selectedCategory === "consultas")
      ? serviceRates
          .filter((sr) => {
            if (!sr.medical_service) return false;
            const idx = serviceSearchIndex.get(sr.id);
            return !term || !!idx && (idx.nombre.includes(term) || idx.doctor.includes(term));
          })
          .map((sr) => ({ type: "service" as const, data: sr }))
      : [];

    if (serviceSort.field !== SIN_ORDEN) {
      serviceItems.sort((a, b) => compareServices(a.data, b.data, serviceSort));
    }

    // Los medicamentos mandan: las consultas van siempre detrás. Para llegar a
    // ellas se teclea el término completo ("dr " con espacio, "consulta"), que
    // deja pocos productos casando y las sube a la primera página.
    return [...productItems, ...serviceItems];
  }, [products, serviceRates, search, barcode, selectedCategory, productSearchIndex, serviceSearchIndex, productSort, serviceSort]);

  // Selección condicional de lote al agregar:
  //  - 0 lotes vendibles → agregar directo, se vende solo por stock_central (producto aún sin lotear).
  //  - 1 lote vendible   → auto-seleccionar.
  //  - varios            → abrir el picker para que el cajero elija.
  function addProductWithLot(cartId: number, product: ProductType) {
    const lots = getSellableLots(product);
    if (lots.length === 0) {
      addToCartOf(cartId, { type: "product", product, quantity: 1 });
      return;
    }
    if (lots.length === 1) {
      addToCartOf(cartId, { type: "product", product, quantity: 1, selectedLot: toSelectedLot(lots[0]) });
      return;
    }
    setPendingLot({ cartId, product });
  }

  function handleLotPicked(lot: InventoryLotOnProduct) {
    if (!pendingLot) return;
    addToCartOf(pendingLot.cartId, {
      type: "product",
      product: pendingLot.product,
      quantity: 1,
      selectedLot: toSelectedLot(lot),
    });
    setPendingLot(null);
  }

  function handleItemClick(gridItem: GridItem) {
    if (gridItem.type === "product") {
      addProductWithLot(activeCartId, gridItem.data);
    } else {
      addToCartOf(activeCartId, { type: "service", serviceRate: gridItem.data, quantity: 1 });
    }
  }

  if (loadingCaja || loadingProducts) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errorProducts === "403") {
    return <div className="flex h-screen flex-col"><Unauthorized /></div>;
  }

  if (!caja && cierreResumen) {
    return <ResumenCierreScreen data={cierreResumen} />;
  }

  if (!caja) {
    return (
      <AperturaCajaDialog
        open={true}
        defaultPharmacyId={pharmacyId ?? undefined}
        onSuccess={(pharmId) => {
          setPharmacyId(pharmId);
          if (pharmId === pharmacyId) refetchCaja();
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={(val) => { if (!val || carts.length < MAX_CARTS) setSidebarOpen(val); }}
        style={{ "--sidebar-width": sidebarWidth } as React.CSSProperties}
        className="min-h-0 flex-1 overflow-hidden"
      >
        <ProductSidebar
          products={products}
          filteredItems={filteredItems}
          serviceRateCount={serviceRates.length}
          categories={categories}
          loading={loadingProducts}
          error={errorProducts}
          search={search}
          onSearchChange={setSearch}
          barcode={barcode}
          onBarcodeChange={setBarcode}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onItemClick={handleItemClick}
          productSort={productSort}
          onProductSortChange={cambiarOrdenProductos}
          serviceSort={serviceSort}
          onServiceSortChange={cambiarOrdenConsultas}
        />

        <SidebarInset>
          <div className="relative flex h-full overflow-x-auto overflow-y-hidden">
            {carts.map((cart, index) => (
              <CartPanel
                key={cart.id}
                cartNumber={index + 1}
                items={cart.items}
                priceMode={cart.priceMode}
                isActive={cart.id === activeCartId}
                products={products}
                onAddProduct={(p) => addProductWithLot(cart.id, p)}
                onUpdateQuantity={(key, delta) => updateQuantityOf(cart.id, key, delta)}
                onRemoveItem={(key) => removeItemOf(cart.id, key)}
                onUpdatePrice={(key, price) => updateItemPriceOf(cart.id, key, price)}
                onUpdateImpuesto={(key, impuesto) => updateItemImpuestoOf(cart.id, key, impuesto)}
                onClear={() => clearCartOf(cart.id)}
                onSetPriceMode={(mode) => setPriceModeOf(cart.id, mode)}
                onSaleComplete={(items) => handleSaleComplete(cart.id, items)}
                onClose={carts.length > 1 ? () => removeCart(cart.id) : undefined}
                onActivate={() => setActiveCartId(cart.id)}
                onAddCart={index === carts.length - 1 && carts.length < MAX_CARTS ? addCart : undefined}
              />
            ))}
          </div>
        </SidebarInset>
      </SidebarProvider>

      <LoteSelectorDialog
        product={pendingLot?.product ?? null}
        open={pendingLot !== null}
        onSelect={handleLotPicked}
        onClose={() => setPendingLot(null)}
      />
    </div>
  );
}