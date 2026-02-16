"use client";

import { Search, ScanBarcode } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  barcode: string;
  onBarcodeChange: (value: string) => void;
}

export function SearchBar({ search, onSearchChange, barcode, onBarcodeChange }: SearchBarProps) {
  return (
    <div className="mb-4 flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 bg-white pl-10"
        />
      </div>
      <div className="relative w-72">
        <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Escanear código de barras..."
          value={barcode}
          onChange={(e) => onBarcodeChange(e.target.value)}
          className="h-10 bg-white pl-10"
        />
      </div>
    </div>
  );
}
