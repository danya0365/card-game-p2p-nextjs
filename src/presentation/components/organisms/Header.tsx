"use client";

import { Menu, Spade, User, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "../molecules/ThemeToggle";

const navLinks = [
  { href: "/", label: "หน้าแรก" },
  { href: "/games", label: "เกมทั้งหมด" },
  { href: "/profile", label: "โปรไฟล์" },
];

/**
 * Main header component with navigation and theme toggle
 */
export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-success transition-colors"
          >
            <div className="flex items-center justify-center w-10 h-10 bg-linear-to-br from-success to-success-dark rounded-xl">
              <Spade className="w-6 h-6 text-white" />
            </div>
            <span className="hidden sm:inline">Card Games</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted hover:text-foreground font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Profile button */}
            <Link
              href="/profile"
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-success hover:bg-success-dark text-white font-medium transition-colors"
            >
              <User className="w-4 h-4" />
              <span>เล่นเลย</span>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted-light transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-lg text-muted hover:text-foreground hover:bg-muted-light font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="mx-4 mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-success hover:bg-success-dark text-white font-medium transition-colors"
              >
                <User className="w-4 h-4" />
                <span>เล่นเลย</span>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
