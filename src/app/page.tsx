"use client";

import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { Navbar } from "@/components/navbar";
import { CategoryFilter } from "@/components/category-filter";
import { ProductCard } from "@/components/product-card";
import { CartSidebar } from "@/components/cart-sidebar";
import { useGetProducts } from "@/api/getProducts";
import { useGetCategories } from "@/api/getCategories";
import { ProductType, CartItem } from "@/types/product";

export default function Home() {
  const { result: products, loading: loadingProducts, error: errorProducts } = useGetProducts();
  const { result: categories } = useGetCategories();

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

  return (
    <div className="flex h-screen flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Product area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-gray-50 p-4">
          <SearchBar
            search={search}
            onSearchChange={setSearch}
            barcode={barcode}
            onBarcodeChange={setBarcode}
          />

          {/* Category filter */}
          <div className="mb-4">
            <CategoryFilter
              categories={categories}
              products={products}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto">
            {loadingProducts ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : errorProducts ? (
              <div className="flex h-full items-center justify-center text-destructive">
                <p>{errorProducts}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={addToCart}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Cart sidebar */}
        <CartSidebar
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onClear={clearCart}
        />
      </div>
    </div>
  );
}
