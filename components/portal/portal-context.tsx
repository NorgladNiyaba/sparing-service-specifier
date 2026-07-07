"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { PortalCompany } from "@/lib/portal-auth";

interface PortalContextValue {
  activeClientId:   string | null;
  availableClients: PortalCompany[];
  switchCompany:    (clientId: string) => Promise<void>;
}

const PortalContext = createContext<PortalContextValue>({
  activeClientId:   null,
  availableClients: [],
  switchCompany:    async () => {},
});

export function usePortalContext() {
  return useContext(PortalContext);
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const [activeClientId,   setActiveClientId]   = useState<string | null>(null);
  const [availableClients, setAvailableClients] = useState<PortalCompany[]>([]);

  useEffect(() => {
    fetch("/api/portal/companies")
      .then((r) => r.json())
      .then((d: { companies: PortalCompany[]; activeClientId: string }) => {
        if (d.companies) {
          setAvailableClients(d.companies);
          setActiveClientId(d.activeClientId);
        }
      })
      .catch(() => {});
  }, []);

  const switchCompany = useCallback(async (clientId: string) => {
    await fetch("/api/portal/companies/switch", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ clientId }),
    });
    setActiveClientId(clientId);
  }, []);

  return (
    <PortalContext.Provider value={{ activeClientId, availableClients, switchCompany }}>
      {children}
    </PortalContext.Provider>
  );
}
