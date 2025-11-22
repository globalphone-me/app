"use client";
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import type { ReactNode } from "react";

// Define props for ClientProviders
interface ClientProvidersProps {
  children: ReactNode;
}

/**
 * ClientProvider wraps the app with essential context providers.
 *
 * - MiniKitProvider:
 *     - Required for MiniKit functionality.
 */
export default function ClientProviders({ children }: ClientProvidersProps) {
  return <MiniKitProvider>{children}</MiniKitProvider>;
}
