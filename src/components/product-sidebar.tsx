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
  const { toggleSidebar } = useSidebar();

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
      {/* Icon - only visible when collapsed */}
      <SidebarContent className="hidden items-center py-4 group-data-[collapsible=icon]:flex">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Buscar productos"
              onClick={toggleSidebar}
            >
              <Search className="ml-2" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      {/* Full panel - hidden when collapsed */}
      <SidebarHeader className="gap-3 p-4 group-data-[collapsible=icon]:hidden">
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

      <SidebarContent className="px-4 pb-4 group-data-[collapsible=icon]:hidden">
        <ProductGrid
          products={filteredProducts}
          loading={loading}
          error={error}
          onProductClick={onProductClick}
        />
      </SidebarContent>
    </Sidebar>
  );
}
