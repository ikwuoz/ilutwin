import Link from 'next/link';
import { ArrowLeft, Box } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-160px)] items-center justify-center bg-[#F2F2EF] px-4 py-16 text-center">
      <div className="w-full max-w-md rounded-2xl border border-[var(--hud-border-subtle)] bg-white p-8 shadow-sm">
        <p className="tabular-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#6E7570]">
          404 · Route Not Found
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#111312]">
          This street route doesn&apos;t exist.
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[#4A504C]">
          Return to the overview or jump straight into the interactive Lagos 3D
          Explorer.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Link
            href="/"
            className="hud-transition inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--hud-border-light)] bg-[#F2F2EF] px-5 py-2.5 text-xs font-semibold text-[#111312] hover:bg-[#EAE9E4]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Overview
          </Link>
          <Link
            href="/explore"
            className="hud-transition inline-flex items-center justify-center gap-1.5 rounded-full border border-[#111312] bg-[#10B954] px-5 py-2.5 text-xs font-bold text-[#111312] hover:bg-[#0EA349]"
          >
            <Box className="h-3.5 w-3.5" />
            Open 3D Explorer
          </Link>
        </div>
      </div>
    </div>
  );
}
