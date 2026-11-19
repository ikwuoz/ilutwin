'use client';

import Link from 'next/link';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function UploadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="rounded-2xl border border-[var(--hud-border-subtle)] bg-white p-6 shadow-sm">
        <AlertCircle className="mx-auto h-8 w-8 text-[#C85A32]" />
        <h2 className="mt-3 text-lg font-bold text-[#111312]">
          Something went wrong on /upload
        </h2>
        <p className="mt-1.5 text-xs text-[#4A504C]">
          {error.message || 'An unexpected error occurred while loading the upload pipeline.'}
        </p>
        <div className="mt-5 flex justify-center gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#111312] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1B6E2D]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
          <Link
            href="/explore"
            className="inline-flex items-center rounded-full border border-[var(--hud-border-light)] bg-[#F2F2EF] px-4 py-2 text-xs font-semibold text-[#111312] hover:bg-[#EAE9E4]"
          >
            Go to 3D Explorer
          </Link>
        </div>
      </div>
    </div>
  );
}
