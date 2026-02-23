"use client";

import { createContext, useContext, useState } from "react";

interface ForbiddenContextType {
  isForbidden: boolean;
  setForbidden: (value: boolean) => void;
}

const ForbiddenContext = createContext<ForbiddenContextType>({
  isForbidden: false,
  setForbidden: () => {},
});

export function ForbiddenProvider({ children }: { children: React.ReactNode }) {
  const [isForbidden, setForbidden] = useState(false);

  return (
    <ForbiddenContext.Provider value={{ isForbidden, setForbidden }}>
      {children}
    </ForbiddenContext.Provider>
  );
}

export function useForbidden() {
  return useContext(ForbiddenContext);
}
