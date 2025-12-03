"use client";

import { ReactNode } from "react";
import { Footer } from "../organisms/Footer";
import { Header } from "../organisms/Header";

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * Main layout template with Header and Footer
 * Used for all public-facing pages
 */
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
