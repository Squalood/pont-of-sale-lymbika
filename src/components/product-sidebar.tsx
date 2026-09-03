"use client";

import { Search } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { CategoryFilter } from "@/components/category-filter";
import { ProductGrid } from "@/components/product-grid";
import { SortMenu } from "@/components/sort-menu";
import { Stethoscope } from "lucide-react";
import {
  PRODUCT_SORT_OPTIONS,
  SERVICE_SORT_OPTIONS,
  SIN_ORDEN,
  type SortState,
} from "@/lib/grid-sort";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ProductType, GridItem } from "@/types/product";
import { CategoryType } from "@/types/category";

interface ProductSidebarProps {
  products: ProductType[];
  filteredItems: GridItem[];
  serviceRateCount: number;
  categories: CategoryType[];
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  barcode: string;
  onBarcodeChange: (value: string) => void;
  selectedCategory: string;
  onSelectCategory: (value: string) => void;
  onItemClick: (item: GridItem) => void;
  productSort: SortState;
  onProductSortChange: (next: SortState) => void;
  serviceSort: SortState;
  onServiceSortChange: (next: SortState) => void;
}

export function ProductSidebar({
  products,
  filteredItems,
  serviceRateCount,
  categories,
  loading,
  error,
  search,
  onSearchChange,
  barcode,
  onBarcodeChange,
  selectedCategory,
  onSelectCategory,
  onItemClick,
  productSort,
  onProductSortChange,
  serviceSort,
  onServiceSortChange,
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Productos</h2>
          <SidebarTrigger />
        </div>
        <SearchBar
          search={search}
          onSearchChange={onSearchChange}
          barcode={barcode}
          onBarcodeChange={onBarcodeChange}
        />
        <CategoryFilter
          categories={categories}
          products={products}
          serviceRateCount={serviceRateCount}
          selected={selectedCategory}
          onSelect={onSelectCategory}
        />
      </SidebarHeader>

      <SidebarContent className="px-4 pb-4 group-data-[collapsible=icon]:hidden">
        <ProductGrid
          items={filteredItems}
          loading={loading}
          error={error}
          onItemClick={onItemClick}
          filterKey={`${search}|${barcode}|${selectedCategory}`}
          controls={
            <>
              <SortMenu
                defaultLabel="Mezclado"
                defaultItemLabel="Mezclado con consultas"
                sortedPrefix="Solo productos"
                options={PRODUCT_SORT_OPTIONS}
                value={productSort}
                onChange={onProductSortChange}
              />
              {/* Fuera de "Todos" y "Consultas" no hay servicios en pantalla, y
                  un orden que no ordena nada visible solo confunde. */}
              {(selectedCategory === "todos" || selectedCategory === "consultas") &&
                productSort.field === SIN_ORDEN && (
                  <SortMenu
                    defaultLabel="Consultas"
                    defaultItemLabel="Sin ordenar"
                    sortedPrefix="Consultas"
                    options={SERVICE_SORT_OPTIONS}
                    value={serviceSort}
                    onChange={onServiceSortChange}
                    icon={<Stethoscope className="h-3.5 w-3.5" />}
                  />
                )}
            </>
          }
        />
      </SidebarContent>
    </Sidebar>
  );
}
