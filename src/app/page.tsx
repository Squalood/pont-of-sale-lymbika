"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductSidebar } from "@/components/product-sidebar";
import { CartPanel } from "@/components/cart-panel";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useGetProducts } from "@/api/getProducts";
import { useGetCategories } from "@/api/getCategories";
import { useGetServiceRates } from "@/api/getServiceRates";
import { ProductType, CartItem, cartItemKey, GridItem } from "@/types/product";
import { Unauthorized } from "@/components/unauthorized";
import { useForbidden } from "@/lib/forbidden-context";
import { getUser } from "@/lib/auth";
import { useCaja } from "@/lib/caja-context";
import { AperturaCajaDialog } from "@/components/apertura-caja-dialog";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { caja, loading: loadingCaja, refetch: refetchCaja } = useCaja();

  const { result: fetchedProducts, loading: loadingProducts, error: errorProducts } = useGetProducts();
  const { result: categories } = useGetCategories();
  const { result: serviceRates } = useGetServiceRates();
  const [products, setProducts] = useState<ProductType[]>([]);

  useEffect(() => {
    setProducts(fetchedProducts);
  }, [fetchedProducts]);
  const { setForbidden } = useForbidden();

  useEffect(() => {
    if (!getUser()) router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (errorProducts === "403") setForbidden(true);
  }, [errorProducts, setForbidden]);

  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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
          .filter((sr) => !term || normalize(sr.medical_service.name).includes(term) || normalize(sr.doctor.doctorName).includes(term))
          .map((sr) => ({ type: "service" as const, data: sr }))
      : [];

    return [...productItems, ...serviceItems];
  }, [products, serviceRates, search, barcode, selectedCategory]);

  function addToCart(item: CartItem) {
    setCartItems((prev) => {
      const key = cartItemKey(item);
      const existing = prev.find((i) => cartItemKey(i) === key);
      if (existing) {
        return prev.map((i) =>
          cartItemKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, item];
    });
  }

  function addProductToCart(product: ProductType) {
    addToCart({ type: "product", product, quantity: 1 });
  }

  function handleItemClick(gridItem: GridItem) {
    if (gridItem.type === "product") {
      addToCart({ type: "product", product: gridItem.data, quantity: 1 });
    } else {
      addToCart({ type: "service", serviceRate: gridItem.data, quantity: 1 });
    }
  }

  function updateQuantity(itemKey: string, delta: number) {
    setCartItems((prev) =>
      prev
        .map((item) =>
          cartItemKey(item) === itemKey ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(itemKey: string) {
    setCartItems((prev) => prev.filter((item) => cartItemKey(item) !== itemKey));
  }

  function clearCart() {
    setCartItems([]);
  }

  function handleSaleComplete(soldItems: CartItem[]) {
    setProducts((prev) =>
      prev.map((p) => {
        const sold = soldItems.find(
          (i) => i.type === "product" && i.product.id === p.id
        );
        if (sold && sold.type === "product") {
          return { ...p, stock_central: p.stock_central - sold.quantity };
        }
        return p;
      })
    );
  }

  if (loadingCaja || loadingProducts) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errorProducts === "403") {
    return (
      <div className="flex h-screen flex-col">
        <Unauthorized />
      </div>
    );
  }

  if (!caja) {
    return <AperturaCajaDialog open={true} onSuccess={refetchCaja} />;
  }

  return (
    <div className="flex h-full flex-col">
      <SidebarProvider
        defaultOpen={true}
        style={{ "--sidebar-width": "75vw" } as React.CSSProperties}
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
        />

        <SidebarInset>
          <div className="relative flex h-full overflow-hidden">
            <SidebarTrigger className="absolute left-2 top-2 z-10 rounded-full shadow-md" />

            <CartPanel
              items={cartItems}
              products={products}
              onAddProduct={addProductToCart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onClear={clearCart}
              onSaleComplete={handleSaleComplete}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}