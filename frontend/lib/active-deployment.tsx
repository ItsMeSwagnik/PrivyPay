"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_DEPLOYMENT, type Deployment } from "./deployment";

interface ActiveDeploymentCtx {
  active: Deployment;
}

const Ctx = createContext<ActiveDeploymentCtx | null>(null);

export function ActiveDeploymentProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ active: DEFAULT_DEPLOYMENT }}>{children}</Ctx.Provider>;
}

export function useActiveDeployment(): ActiveDeploymentCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useActiveDeployment must be used within ActiveDeploymentProvider");
  return ctx;
}
