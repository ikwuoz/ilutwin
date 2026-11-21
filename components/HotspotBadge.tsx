'use client';

import {
  formatNgn,
  getPinComputedCost,
  getPinInstanceCount,
  type CommunityProblemPin,
  type PinCategory,
} from '@/lib/data/upgrades';

interface HotspotBadgeProps {
  pin: CommunityProblemPin;
  isSelected: boolean;
  isUpgradeActive: boolean;
  onSelect: (pin: CommunityProblemPin) => void;
}

const CATEGORY_BADGE_COLORS: Record<PinCategory, string> = {
  Flooding: 'bg-[#0F4C4C] text-white',
  'No Streetlight': 'bg-[#D9822B] text-white',
  'Waste Overflow': 'bg-[#C85A32] text-white',
  'Open Drain': 'bg-[#0F4C4C] text-white',
  'Dark Alley': 'bg-[#D9822B] text-white',
  'Flooded Walkway': 'bg-[#1B6E2D] text-white',
  'Custom Upgrade': 'bg-[#5B21B6] text-white',
};

const CATEGORY_DOT_COLORS: Record<PinCategory, string> = {
  Flooding: 'bg-[#0EA5E9]',
  'No Streetlight': 'bg-[#F59E0B]',
  'Waste Overflow': 'bg-[#E1262D]',
  'Open Drain': 'bg-[#0EA5E9]',
  'Dark Alley': 'bg-[#F59E0B]',
  'Flooded Walkway': 'bg-[#10B954]',
  'Custom Upgrade': 'bg-[#8B5CF6]',
};

export function HotspotBadge({
  pin,
  isSelected,
  isUpgradeActive,
  onSelect,
}: HotspotBadgeProps) {
  const dotColor = isUpgradeActive
    ? 'bg-[#10B954]'
    : CATEGORY_DOT_COLORS[pin.category];
  const computedCost = getPinComputedCost(pin);
  const instanceCount = getPinInstanceCount(pin);

  return (
    <div className="group relative inline-flex flex-col items-center">
      {/* Hover / Selected Popover */}
      <div
        className={`pointer-events-none absolute bottom-full mb-2 w-56 rounded-xl border p-2.5 text-left shadow-xl backdrop-blur-xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isSelected
            ? 'translate-y-0 border-[rgba(255,255,255,0.2)] bg-[rgba(12,14,17,0.9)] text-white opacity-100'
            : 'translate-y-1 border-[rgba(17,19,18,0.12)] bg-[rgba(255,255,255,0.96)] text-[#111312] opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-bold">{pin.title}</span>
          <span
            className={`tabular-mono shrink-0 text-[10px] font-bold ${
              isSelected ? 'text-[#10B954]' : 'text-[#1B6E2D]'
            }`}
          >
            {formatNgn(computedCost)}
          </span>
        </div>
        <p
          className={`mt-1 line-clamp-2 text-[10px] leading-snug ${
            isSelected ? 'text-white/75' : 'text-[#4A504C]'
          }`}
        >
          {pin.residentNote}
        </p>
        <div
          className={`tabular-mono mt-1.5 flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider ${
            isSelected ? 'text-white/60' : 'text-[#6E7570]'
          }`}
        >
          <span>{pin.householdsImpacted} households</span>
          <span>{isUpgradeActive ? 'Fix Active' : 'Baseline'}</span>
        </div>
      </div>

      {/* Compact Non-Intrusive Spatial Pill */}
      <button
        type="button"
        onClick={() => onSelect(pin)}
        className={`hud-transition flex items-center gap-1.5 rounded-full border px-2 py-0.5 shadow-md backdrop-blur-md active:scale-[0.98] ${
          isSelected
            ? 'scale-105 border-[#10B954] bg-[#0F4C4C]/95 text-white ring-2 ring-[#10B954]/35'
            : 'border-white/85 bg-white/92 text-[#111312] hover:scale-105 hover:border-[#111312]/30'
        }`}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span
            className={`animate-ilu-pulse absolute inline-flex h-full w-full rounded-full ${dotColor}`}
          />
          <span
            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColor}`}
          />
        </span>

        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            CATEGORY_BADGE_COLORS[pin.category]
          }`}
        >
          {pin.category}
        </span>

        <span
          className={`tabular-mono pr-0.5 text-[10px] font-bold ${
            isSelected ? 'text-white/90' : 'text-[#4A504C]'
          }`}
        >
          {instanceCount > 1 ? `×${instanceCount} · ` : ''}
          {formatNgn(computedCost)}
        </span>
      </button>
    </div>
  );
}
