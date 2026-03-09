"use client";

import { createContext, useContext } from "react";
import { CajaType } from "@/types/caja";
import { useGetCajaAbierta } from "@/api/getCajaAbierta";
import { useEfectivoCaja, EfectivoCaja } from "@/api/useEfectivoCaja";

interface CajaContextType {
  caja: CajaType | null;
  loading: boolean;
  refetch: () => void;
  efectivo: EfectivoCaja | null;
  refetchEfectivo: () => void;
}

const CajaContext = createContext<CajaContextType>({
  caja: null,
  loading: true,
  refetch: () => {},
  efectivo: null,
  refetchEfectivo: () => {},
});

export function CajaProvider({ children }: { children: React.ReactNode }) {
  const { result, loading, refetch } = useGetCajaAbierta();
  const { result: efectivo, refetch: refetchEfectivo } = useEfectivoCaja(result?.fondoInicial ?? null);

  return (
    <CajaContext.Provider value={{ caja: result, loading, refetch, efectivo, refetchEfectivo }}>
      {children}
    </CajaContext.Provider>
  );
}

export function useCaja() {
  return useContext(CajaContext);
}
