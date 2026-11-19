'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  if (pathname === '/explore') {
    return null;
  }

  return (
    <footer className="border-t border-[var(--hud-border-subtle)] bg-[#F2F2EF] py-8 text-xs text-[#4A504C] print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-bold text-[#111312]">
            ÌlúTwin — Lagos Community 3D Digital Twin
          </p>
          <p className="mt-0.5 text-[11px] text-[#6E7570]">
            Built for the Aholo Global 3D AI Hackathon · Aholo World (3DGS)
            &amp; Lux3D.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold">
          <Link href="/" className="hover:text-[#111312]">
            Overview
          </Link>
          <Link href="/upload" className="hover:text-[#111312]">
            Upload Street Media
          </Link>
          <Link href="/explore" className="hover:text-[#111312]">
            3D Explorer
          </Link>
        </div>
      </div>
    </footer>
  );
}
