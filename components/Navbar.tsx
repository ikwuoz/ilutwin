'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import { IluTwinMark } from '@/components/IluTwinMark';

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/upload', label: 'Upload' },
  { href: '/explore', label: '3D Explorer' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--hud-border-subtle)] bg-[#F2F2EF]/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: ÌlúTwin iOS-Rounded Mark */}
        <Link href="/" className="group flex items-center gap-2.5">
          <IluTwinMark className="hud-transition h-8 w-8 shrink-0 group-hover:scale-[1.04]" />
          <span className="text-base font-extrabold tracking-tight text-[#111312]">
            ÌlúTwin
          </span>
        </Link>

        {/* Center: Ctrl-style Capsule Nav with Hairline Dividers */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center rounded-full border border-[var(--hud-border-subtle)] bg-[#EEEDE9] px-1.5 py-1 sm:flex"
        >
          {NAV_ITEMS.map(({ href, label }, idx) => {
            const active = pathname === href;
            return (
              <Fragment key={href}>
                {idx > 0 && (
                  <span
                    aria-hidden="true"
                    className="mx-0.5 h-3.5 w-px bg-[var(--hud-border-light)]"
                  />
                )}
                <Link
                  href={href}
                  className={`hud-transition rounded-full px-3.5 py-1 text-xs font-semibold active:scale-[0.98] ${
                    active
                      ? 'bg-[#111312] text-white shadow-xs'
                      : 'text-[#4A504C] hover:text-[#111312]'
                  }`}
                >
                  {label}
                </Link>
              </Fragment>
            );
          })}
        </nav>

        {/* Right: Context-Aware Action Pill + Mobile Toggle */}
        <div className="flex items-center gap-2">
          <Link
            href={pathname === '/explore' ? '/upload' : '/explore'}
            className="hud-transition hidden items-center gap-1.5 rounded-full bg-[#111312] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1B6E2D] active:scale-[0.98] sm:inline-flex"
          >
            <span>
              {pathname === '/explore' ? 'Upload Scan' : 'Launch 3D'}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--hud-border-light)] bg-white text-[#111312] sm:hidden"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <nav className="border-t border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1.5">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    active
                      ? 'bg-[#111312] text-white'
                      : 'text-[#4A504C] hover:bg-[#EAE9E4]'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
