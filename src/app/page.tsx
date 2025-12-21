"use client";

import { UserGrid } from "@/components/user-grid";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Banner1 } from "@/components/banner1";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Header />

      {/* Disclaimer Banner */}
      <Banner1
        title="Beta Disclaimer"
        description="This is a Beta release of our product. Use at your own risk. We cannot guarantee phone privacy yet."
        linkUrl=""
        linkText=""
      />

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-6 py-8">
        <UserGrid />
      </main>

      <Footer />
    </div>
  );
}
