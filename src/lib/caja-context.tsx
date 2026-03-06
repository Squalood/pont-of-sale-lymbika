"use client";

import { createContext, useContext } from "react";
import { CajaType } from "@/types/caja";
import { useGetCajaAbierta } from "@/api/getCajaAbierta";

interface CajaContextType {
  caja: CajaType | null;
  loading: boolean;
  refetch: () => void;
}

const CajaContext = createContext<CajaContextType>({
  caja: null,
  loading: true,
  refetch: () => {},
});

export function CajaProvider({ children }: { children: React.ReactNode }) {
  const { result, loading, refetch } = useGetCajaAbierta();

  return (
    <CajaContext.Provider value={{ caja: result, loading, refetch }}>
      {children}
    </CajaContext.Provider>
  );
}

export function useCaja() {
  return useContext(CajaContext);
}
