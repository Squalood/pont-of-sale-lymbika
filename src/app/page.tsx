"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductSidebar } from "@/components/product-sidebar";
import { CartPanel } from "@/components/cart-panel";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useGetProducts } from "@/api/getProducts";
import { useGetCategories } from "@/api/getCategories";
import { ProductType, CartItem } from "@/types/product";
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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const term = search.toLowerCase();
      const matchesSearch =
        p.productName.toLowerCase().includes(term) ||
        p.sal?.toLowerCase().includes(term);
      const matchesBarcode =
        !barcode || p.barCode?.toLowerCase().includes(barcode.toLowerCase());
      const matchesCategory =
        selectedCategory === "todos" || p.category?.slug === selectedCategory;
      return matchesSearch && matchesBarcode && matchesCategory;
    });
  }, [products, search, barcode, selectedCategory]);

  function addToCart(product: ProductType) {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: number, delta: number) {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(productId: number) {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function clearCart() {
    setCartItems([]);
  }

  function handleSaleComplete(soldItems: CartItem[]) {
    setProducts((prev) =>
      prev.map((p) => {
        const sold = soldItems.find((i) => i.product.id === p.id);
        if (sold) return { ...p, stock_central: p.stock_central - sold.quantity };
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
        defaultOpen={false}
        style={{ "--sidebar-width": "75vw" } as React.CSSProperties}
        className="min-h-0 flex-1 overflow-hidden"
      >
        <ProductSidebar
          products={products}
          filteredProducts={filteredProducts}
          categories={categories}
          loading={loadingProducts}
          error={errorProducts}
          search={search}
          onSearchChange={setSearch}
          barcode={barcode}
          onBarcodeChange={setBarcode}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onProductClick={addToCart}
        />

        <SidebarInset>
          <div className="relative flex h-full overflow-hidden">
            <SidebarTrigger className="absolute left-2 top-2 z-10 rounded-full shadow-md" />

            <CartPanel
              items={cartItems}
              products={products}
              onAddProduct={addToCart}
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