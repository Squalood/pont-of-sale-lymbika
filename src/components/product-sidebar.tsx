"use client";

import { Search } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { CategoryFilter } from "@/components/category-filter";
import { ProductGrid } from "@/components/product-grid";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { ProductType } from "@/types/product";
import { CategoryType } from "@/types/category";

interface ProductSidebarProps {
  products: ProductType[];
  filteredProducts: ProductType[];
  categories: CategoryType[];
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  barcode: string;
  onBarcodeChange: (value: string) => void;
  selectedCategory: string;
  onSelectCategory: (value: string) => void;
  onProductClick: (product: ProductType) => void;
}

export function ProductSidebar({
  products,
  filteredProducts,
  categories,
  loading,
  error,
  search,
  onSearchChange,
  barcode,
  onBarcodeChange,
  selectedCategory,
  onSelectCategory,
  onProductClick,
}: ProductSidebarProps) {
  const { toggleSidebar, state } = useSidebar();

  return (
    <Sidebar
      side="left"
      variant="sidebar"
      collapsible="icon"
      className="border-r"
      style={{
        top: "var(--navbar-height, 3.5rem)",
        height: "calc(100svh - var(--navbar-height, 3.5rem))",
        bottom: "auto",
      }}
    >
      {state === "collapsed" ? (
        <SidebarContent className="items-center py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Buscar productos"
                onClick={toggleSidebar}
              >
                <Search className="h-5 w-5" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      ) : (
        <>
          <SidebarHeader className="gap-3 p-4">
            <h2 className="text-lg font-semibold">Productos</h2>
            <SearchBar
              search={search}
              onSearchChange={onSearchChange}
              barcode={barcode}
              onBarcodeChange={onBarcodeChange}
            />
            <CategoryFilter
              categories={categories}
              products={products}
              selected={selectedCategory}
              onSelect={onSelectCategory}
            />
          </SidebarHeader>

          <SidebarContent className="px-4 pb-4">
            <ProductGrid
              products={filteredProducts}
              loading={loading}
              error={error}
              onProductClick={onProductClick}
            />
          </SidebarContent>
        </>
      )}
    </Sidebar>
  );
}
