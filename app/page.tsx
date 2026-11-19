import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { IluTwinMark } from '@/components/IluTwinMark';
import {
  COMMUNITY_PROBLEM_PINS,
  formatNgn,
} from '@/lib/data/upgrades';
import { LAGOS_ASSET_PRESETS } from '@/lib/presets/lagos-upgrades';

const WORKFLOW_SPECS = [
  {
    code: '01',
    tag: 'PHONE CAPTURE',
    title: 'Walk & Film Any Street',
    detail:
      'Record a short walkthrough video or overlapping photos in narrow Lagos alleys without specialist survey gear.',
    icon: Camera,
    dot: 'bg-[#E1262D]',
  },
  {
    code: '02',
    tag: 'AHOLO WORLD · 3DGS',
    title: 'Reconstruct Real Context',
    detail:
      'Generate a true-to-life 3D Gaussian Splatting twin of compound thresholds, drains, and dark corridors.',
    icon: MapPin,
    dot: 'bg-[#F59E0B]',
  },
  {
    code: '03',
    tag: 'AHOLO LUX3D · G1',
    title: 'Drop & Cost Upgrades',
    detail:
      'Pin problem spots in 3D, place Lux3D covered drains, solar poles, and waste hubs, and export Naira (₦) briefs.',
    icon: Sparkles,
    dot: 'bg-[#10B954]',
  },
];

export default function HomePage() {
  return (
    <div className="bg-[#F2F2EF] pb-16 text-[#111312]">
      {/* Subtle Top Corridor Strip */}
      <div className="border-b border-[var(--hud-border-subtle)] bg-[#E3F1E6] px-4 py-2 text-center">
        <p className="inline-flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-[#111312]">
          <span className="h-2 w-2 rounded-full bg-[#10B954]" />
          <span>
            Lagos Street Corridor · Aholo 3DGS + Lux3D Upgrade Twin
          </span>
          <Link
            href="/explore"
            className="inline-flex items-center gap-0.5 font-bold text-[#1B6E2D] underline-offset-2 hover:underline"
          >
            Open live twin
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </p>
      </div>

      {/* Minimalist Centered Hero (Ctrl-inspired) */}
      <section className="border-b border-[var(--hud-border-subtle)] bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="tabular-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#6E7570]">
            Lagos Informal Settlement Digital Twin
          </p>

          <h1 className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-4xl font-extrabold tracking-[-0.035em] text-[#111312] sm:text-6xl sm:leading-[1.05]">
            <span>Map Streets.</span>
            <IluTwinMark className="h-11 w-11 shrink-0 sm:h-14 sm:w-14" />
            <span>Build Safer.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#4A504C] sm:text-base">
            Turn smartphone walkthrough videos into interactive 3D twins with{' '}
            <strong className="font-semibold text-[#111312]">
              Aholo World
            </strong>
            , drop community problem pins, and co-design flood &amp; solar
            upgrades with{' '}
            <strong className="font-semibold text-[#111312]">
              Aholo Lux3D
            </strong>
            .
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/explore"
              className="hud-transition inline-flex items-center justify-center gap-2 rounded-full border border-[#111312] bg-[#10B954] px-7 py-3 text-sm font-bold text-[#111312] shadow-xs hover:bg-[#0EA349] active:scale-[0.98]"
            >
              <span>Explore 3D Street Twin</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/upload"
              className="hud-transition inline-flex items-center justify-center gap-2 rounded-full border border-[var(--hud-border-light)] bg-[#F2F2EF] px-6 py-3 text-sm font-semibold text-[#111312] hover:bg-[#EAE9E4] active:scale-[0.98]"
            >
              Upload Street Video
            </Link>
          </div>
        </div>
      </section>

      {/* Dark Obsidian Technical Spec Showcase (Nothing-inspired) */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <div
          className="overflow-hidden rounded-2xl border border-[var(--hud-border-dark)] bg-[#0B0D10] text-white shadow-xl"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Technical HUD top bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hud-border-dark)] bg-[#111418]/90 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 bg-[#E1262D]" />
              <span className="tabular-mono text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
                ÌLÚTWIN · SPATIAL PIPELINE (01—03)
              </span>
            </div>
            <span className="tabular-mono text-[11px] text-white/55">
              AHOLO WORLD + LUX3D G1
            </span>
          </div>

          <div className="grid divide-y divide-[var(--hud-border-dark)] md:grid-cols-3 md:divide-x md:divide-y-0">
            {WORKFLOW_SPECS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.code} className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="tabular-mono text-[11px] font-semibold tracking-[0.1em] text-white/60">
                      {step.code} · {step.tag}
                    </span>
                    <span className={`h-2 w-2 rounded-full ${step.dot}`} />
                  </div>
                  <div className="mt-5 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--hud-border-dark)] bg-white/5">
                    <Icon className="h-4 w-4 text-[#10B954]" />
                  </div>
                  <h2 className="mt-4 text-base font-bold tracking-tight text-white">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-white/65">
                    {step.detail}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Technical HUD footer strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hud-border-dark)] bg-[#111418]/90 px-5 py-3">
            <span className="tabular-mono text-[11px] text-white/60">
              OVER 60% OF LAGOS RESIDENTS LIVE IN INFORMAL SETTLEMENTS · ACRC /
              WORLD BANK
            </span>
            <Link
              href="/explore"
              className="tabular-mono inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#10B954] hover:underline"
            >
              INSPECT STREET TWIN
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Street Hotspots & Actionable Civic Costing */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="tabular-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#1B6E2D]">
              Active Interventions
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#111312]">
              Pinned community issues ready for 3D budgeting
            </h2>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#111312] hover:text-[#1B6E2D]"
          >
            Toggle Current vs. Upgrade
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {COMMUNITY_PROBLEM_PINS.map((pin) => (
            <div
              key={pin.id}
              className="flex flex-col justify-between rounded-2xl border border-[var(--hud-border-subtle)] bg-white p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#EAE9E4] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#111312]">
                    {pin.category}
                  </span>
                  <span className="tabular-mono text-xs font-bold text-[#1B6E2D]">
                    {formatNgn(pin.estimatedCostNgn)}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#111312]">
                  {pin.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#4A504C]">
                  {pin.residentNote}
                </p>
              </div>

              <div className="tabular-mono mt-4 flex items-center justify-between border-t border-[var(--hud-border-subtle)] pt-3 text-[11px] font-semibold text-[#6E7570]">
                <span>{pin.householdsImpacted} households</span>
                <span className="text-[#0F4C4C]">{pin.impactMetric}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Compact Lux3D Preset Strip */}
        <div className="mt-6 rounded-2xl border border-[var(--hud-border-subtle)] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="tabular-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#6E7570]">
              Lux3D Asset Catalog
            </span>
            <Link
              href="/upload"
              className="text-xs font-bold text-[#1B6E2D] hover:underline"
            >
              Generate custom GLB →
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {LAGOS_ASSET_PRESETS.map((preset) => (
              <span
                key={preset.id}
                className="rounded-full border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-3 py-1 text-xs font-medium text-[#111312]"
              >
                {preset.title}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
