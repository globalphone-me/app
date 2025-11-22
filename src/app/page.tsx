"use client";

import { MiniKit } from "@worldcoin/minikit-js";

export default function Home() {
  console.log("hello");
  console.log(MiniKit.isInstalled());
  return (
    <div>
      <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <h1>x402 Phone</h1>
      </div>
    </div>
  );
}
