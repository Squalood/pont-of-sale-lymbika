"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CajaType } from "@/types/caja";
import { useGetCajaAbierta } from "@/api/getCajaAbierta";
import { useEfectivoCaja, EfectivoCaja } from "@/api/useEfectivoCaja";

interface CajaContextType {
  caja: CajaType | null;
  loading: boolean;
  refetch: () => void;
  efectivo: EfectivoCaja | null;
  refetchEfectivo: () => void;
  pharmacyId: string | null | undefined;
  setPharmacyId: (id: string) => void;
}

const CajaContext = createContext<CajaContextType>({
  caja: null,
  loading: true,
  refetch: () => {},
  efectivo: null,
  refetchEfectivo: () => {},
  pharmacyId: undefined,
  setPharmacyId: () => {},
});

export function CajaProvider({ children }: { children: React.ReactNode }) {
  const [pharmacyId, setPharmacyIdState] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setPharmacyIdState(localStorage.getItem("pos_pharmacy_id"));
  }, []);

  const setPharmacyId = useCallback((id: string) => {
    localStorage.setItem("pos_pharmacy_id", id);
    setPharmacyIdState(id);
  }, []);

  const { result, loading, refetch } = useGetCajaAbierta(pharmacyId);
  const { result: efectivo, refetch: refetchEfectivo } = useEfectivoCaja(
    result?.fondoInicial ?? null,
    result?.pharmacy?.documentId ?? null,
  );

  return (
    <CajaContext.Provider value={{ caja: result, loading, refetch, efectivo, refetchEfectivo, pharmacyId, setPharmacyId }}>
      {children}
    </CajaContext.Provider>
  );
}

export function useCaja() {
  return useContext(CajaContext);
}
