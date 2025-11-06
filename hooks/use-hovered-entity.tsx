"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type HoveredEntity =
  | { type: "record"; recordId: string }
  | { type: "combination"; combination: string }
  | null;

type HoveredEntityContextValue = {
  hoveredEntity: HoveredEntity;
  setHoveredEntity: Dispatch<SetStateAction<HoveredEntity>>;
};

const HoveredEntityContext = createContext<HoveredEntityContextValue | null>(
  null
);

export function HoveredEntityProvider({ children }: { children: ReactNode }) {
  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity>(null);

  const value = useMemo(
    () => ({ hoveredEntity, setHoveredEntity }),
    [hoveredEntity]
  );

  return (
    <HoveredEntityContext.Provider value={value}>
      {children}
    </HoveredEntityContext.Provider>
  );
}

export function useHoveredEntity() {
  const context = useContext(HoveredEntityContext);
  if (!context) {
    throw new Error(
      "useHoveredEntity must be used within a HoveredEntityProvider"
    );
  }
  return context;
}
