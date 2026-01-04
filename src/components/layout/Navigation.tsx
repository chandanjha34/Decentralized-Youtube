'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { cn } from '@/lib/utils';

/**
 * Navigation Component
 * 
 * Floating pill-style header with backdrop blur effect.
 * Includes navigation links and wallet connect button.
 * Responsive with mobile menu.
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 9.5
 */

interface NavigationLink {
  label: string;
  href: string;
}

const navigationLinks: NavigationLink[] = [
  { label: 'Explore', href: '/explore' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Upload', href: '/upload' },
  { label: 'Contact', href: '/contact' },
];

export function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-4 px-4">
      <div className="max-w-[700px] mx-auto">
        <nav className="bg-[#F7F5F3] backdrop-blur-[8.25px] rounded-full shadow-[0px_0px_0px_2px_rgba(255,255,255,0.08)] h-12 sm:h-14 px-4 sm:px-6 flex items-center justify-between">
          {/* Logo/Brand */}
          <Link 
            href="/" 
            className="text-[#37322F] font-semibold text-lg sm:text-xl font-serif hover:opacity-80 transition-opacity"
          >
            Unlock
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-[#37322F]",
                  pathname === link.href
                    ? "text-[#37322F]"
                    : "text-[#37322F]/70"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Wallet Button */}
          <div className="hidden md:block">
            <ConnectButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-[#37322F] p-2 hover:bg-[#37322F]/5 rounded-full transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-2 bg-[#F7F5F3] backdrop-blur-[8.25px] rounded-2xl shadow-md border border-[#E0DEDB] overflow-hidden">
            <div className="flex flex-col p-4 gap-2">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "text-sm font-medium px-4 py-2 rounded-lg transition-colors",
                    pathname === link.href
                      ? "text-[#37322F] bg-[#37322F]/5"
                      : "text-[#37322F]/70 hover:text-[#37322F] hover:bg-[#37322F]/5"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-[#E0DEDB] mt-2">
                <ConnectButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
