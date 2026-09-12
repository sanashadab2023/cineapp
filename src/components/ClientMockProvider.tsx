"use client";

import { useEffect } from "react";
import { initClientMockInterceptor } from "@/lib/client-mock-api";

export default function ClientMockProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initClientMockInterceptor();
  }, []);

  return <>{children}</>;
}
