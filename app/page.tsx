"use client";

import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "../src/App";
import { config, queryClient } from "../src/walletkit";
import "../src/index.css";
import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function Page() {
  useEffect(() => {
    (async () => {
      try {
        const inMini = await sdk.isInMiniApp();
        if (inMini) {
          await sdk.actions.ready();
        }
      } catch {}
    })();
  }, []);
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  );
}


