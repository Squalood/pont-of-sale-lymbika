"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductSidebar } from "@/components/product-sidebar";
import { CartPanel } from "@/components/cart-panel";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useGetProducts } from "@/api/getProducts";
import { useGetCategories } from "@/api/getCategories";
import { useGetServiceRates } from "@/api/getServiceRates";
import { ProductType, GridItem } from "@/types/product";
import { Unauthorized } from "@/components/unauthorized";
import { useForbidden } from "@/lib/forbidden-context";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";
import { AperturaCajaDialog } from "@/components/apertura-caja-dialog";
import { Loader2 } from "lucide-react";
import { useMultiCart, MAX_CARTS } from "@/hooks/useMultiCart";

export default function Home() {
  const router = useRouter();
  const { caja, loading: loadingCaja, refetch: refetchCaja } = useCaja();

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

  const {
    carts, activeCartId, setActiveCartId,
    sidebarOpen, setSidebarOpen, sidebarWidth,
    addToCartOf, updateQuantityOf, removeItemOf,
    updateItemPriceOf, clearCartOf, setMemberOf,
    addCart, removeCart, handleSaleComplete,
  } = useMultiCart(setProducts);

  const filteredItems = useMemo((): GridItem[] => {
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const term = normalize(search);

    const productItems: GridItem[] = selectedCategory === "consultas"
      ? []
      : products
          .filter((p) => {
            const matchesSearch =
              normalize(p.productName).includes(term) ||
              (p.sal ? normalize(p.sal).includes(term) : false);
            const matchesBarcode =
              !barcode || p.barCode?.toLowerCase().includes(barcode.toLowerCase());
            const matchesCategory =
              selectedCategory === "todos" || p.category?.slug === selectedCategory;
            return matchesSearch && matchesBarcode && matchesCategory;
          })
          .map((p) => ({ type: "product" as const, data: p }));

    const serviceItems: GridItem[] = selectedCategory === "todos" || selectedCategory === "consultas"
      ? serviceRates
          .filter((sr) => {
            if (!sr.medical_service) return false;
            if (selectedCategory === "consultas" && sr.medical_service.type !== "consultation") return false;
            return !term || normalize(sr.medical_service.name).includes(term) || (sr.doctor ? normalize(sr.doctor.doctorName).includes(term) : false);
          })
          .map((sr) => ({ type: "service" as const, data: sr }))
      : [];

    return [...productItems, ...serviceItems];
  }, [products, serviceRates, search, barcode, selectedCategory]);

  function handleItemClick(gridItem: GridItem) {
    if (gridItem.type === "product") {
      addToCartOf(activeCartId, { type: "product", product: gridItem.data, quantity: 1 });
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

  if (!caja) {
    return <AperturaCajaDialog open={true} onSuccess={refetchCaja} />;
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
          serviceRateCount={serviceRates.filter((sr) => sr.medical_service?.type === "consultation").length}
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
        />

        <SidebarInset>
          <div className="relative flex h-full overflow-x-auto overflow-y-hidden">
            {carts.map((cart, index) => (
              <CartPanel
                key={cart.id}
                cartNumber={index + 1}
                items={cart.items}
                isMember={cart.isMember}
                isActive={cart.id === activeCartId}
                products={products}
                onAddProduct={(p) => addToCartOf(cart.id, { type: "product", product: p, quantity: 1 })}
                onUpdateQuantity={(key, delta) => updateQuantityOf(cart.id, key, delta)}
                onRemoveItem={(key) => removeItemOf(cart.id, key)}
                onUpdatePrice={(key, price) => updateItemPriceOf(cart.id, key, price)}
                onClear={() => clearCartOf(cart.id)}
                onSetMember={(val) => setMemberOf(cart.id, val)}
                onSaleComplete={(items) => handleSaleComplete(cart.id, items)}
                onClose={carts.length > 1 ? () => removeCart(cart.id) : undefined}
                onActivate={() => setActiveCartId(cart.id)}
                onAddCart={index === carts.length - 1 && carts.length < MAX_CARTS ? addCart : undefined}
              />
            ))}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}