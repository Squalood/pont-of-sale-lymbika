"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CajaType } from "@/types/caja";
import { useGetCajaAbierta } from "@/api/getCajaAbierta";
import { useEfectivoCaja, EfectivoCaja } from "@/api/useEfectivoCaja";
import { CierreResumenData } from "@/types/cierre";
import { autoCloseCajas } from "@/api/autoCloseCajas";

interface CajaContextType {
  caja: CajaType | null;
  loading: boolean;
  refetch: () => void;
  efectivo: EfectivoCaja | null;
  refetchEfectivo: () => void;
  pharmacyId: string | null | undefined;
  setPharmacyId: (id: string) => void;
  cierreResumen: CierreResumenData | null;
  setCierreResumen: (data: CierreResumenData | null) => void;
}

const CajaContext = createContext<CajaContextType>({
  caja: null,
  loading: true,
  refetch: () => {},
  efectivo: null,
  refetchEfectivo: () => {},
  pharmacyId: undefined,
  setPharmacyId: () => {},
  cierreResumen: null,
  setCierreResumen: () => {},
});

export function CajaProvider({ children }: { children: React.ReactNode }) {
  const [pharmacyId, setPharmacyIdState] = useState<string | null | undefined>(undefined);
  const [cierreResumen, setCierreResumen] = useState<CierreResumenData | null>(null);

  useEffect(() => {
    setPharmacyIdState(localStorage.getItem("pos_pharmacy_id"));
  }, []);

  const setPharmacyId = useCallback((id: string) => {
    localStorage.setItem("pos_pharmacy_id", id);
    setPharmacyIdState(id);
  }, []);

  useEffect(() => {
    if (!pharmacyId) return;
    autoCloseCajas(pharmacyId).catch(() => {});
  }, [pharmacyId]);

  const { result, loading, refetch } = useGetCajaAbierta(pharmacyId);
  const { result: efectivo, refetch: refetchEfectivo } = useEfectivoCaja(
    result?.fondoInicial ?? null,
    result?.pharmacy?.documentId ?? null,
  );

  return (
    <CajaContext.Provider value={{ caja: result, loading, refetch, efectivo, refetchEfectivo, pharmacyId, setPharmacyId, cierreResumen, setCierreResumen }}>
      {children}
    </CajaContext.Provider>
  );
}

export function useCaja() {
  return useContext(CajaContext);
}
