import { UploadPipeline } from '@/components/UploadPipeline';

export default function UploadPage() {
  return (
    <div className="bg-[#F2F2EF] pb-16 text-[#111312]">
      {/* Minimalist Page Header */}
      <section className="border-b border-[var(--hud-border-subtle)] bg-white py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="tabular-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#6E7570]">
            01 · Capture &amp; Generate
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-[-0.03em] text-[#111312] sm:text-4xl">
            Upload street footage &amp; generate 3D upgrades.
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#4A504C]">
            Reconstruct real Lagos corridors with{' '}
            <strong className="font-semibold text-[#111312]">
              Aholo World (3DGS)
            </strong>
            , then generate flood, drainage, and solar GLB assets with{' '}
            <strong className="font-semibold text-[#111312]">
              Aholo Lux3D
            </strong>{' '}
            (<code className="tabular-mono text-xs">G1-Turbo</code>).
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
        <UploadPipeline />
      </div>
    </div>
  );
}
