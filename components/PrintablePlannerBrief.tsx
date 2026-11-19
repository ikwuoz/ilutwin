'use client';

import { IluTwinMark } from '@/components/IluTwinMark';
import {
  formatNgn,
  type CivicImpactSummary,
  type ViewMode,
} from '@/lib/data/upgrades';

interface PrintablePlannerBriefProps {
  viewMode: ViewMode;
  summary: CivicImpactSummary;
  generatedAt: string;
}

export function PrintablePlannerBrief({
  viewMode,
  summary,
  generatedAt,
}: PrintablePlannerBriefProps) {
  const rows =
    viewMode === 'upgrade' ? summary.activePins : summary.plannedPins;

  return (
    <section className="hidden bg-white p-8 text-[#111312] print:block">
      <div className="border-b-2 border-[#111312] pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-center gap-3">
            <IluTwinMark className="h-9 w-9 shrink-0" />
            <div>
              <p className="tabular-mono mt-1 truncate text-[11px] font-bold uppercase tracking-[0.1em] text-[#1B6E2D]">
                ÌlúTwin · Lagos Residential Street
              </p>
              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">
                Lagos Street Upgrade &amp; Civic Impact Brief
              </h1>
            </div>
          </div>
          <div className="tabular-mono text-right text-[11px] text-[#4A504C]">
            <div>Generated: {generatedAt || 'Live Session'}</div>
            <div>
              View Mode:{' '}
              <strong className="text-[#111312]">
                {viewMode === 'upgrade' ? 'Lux3D Upgrade' : 'Current Reality'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#D5D8D4] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E7570]">
            Est. Local Deployment Cost
          </div>
          <div className="tabular-mono mt-1 text-xl font-bold text-[#111312]">
            {formatNgn(
              viewMode === 'upgrade'
                ? summary.totalCostNgn
                : summary.plannedCostNgn
            )}
          </div>
        </div>
        <div className="rounded-xl border border-[#D5D8D4] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E7570]">
            Impacted Households
          </div>
          <div className="tabular-mono mt-1 text-xl font-bold text-[#1B6E2D]">
            {viewMode === 'upgrade'
              ? summary.householdsImpacted
              : summary.plannedHouseholdsImpacted}{' '}
            households
          </div>
        </div>
        <div className="rounded-xl border border-[#D5D8D4] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E7570]">
            Selected Interventions
          </div>
          <div className="tabular-mono mt-1 text-xl font-bold text-[#0F4C4C]">
            {rows.length} upgrades
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#111312]">
          Itemized Street Interventions
        </h2>
        <table className="mt-2 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#D5D8D4] bg-[#F2F2EF]">
              <th className="p-2.5 font-bold">Hotspot &amp; Category</th>
              <th className="p-2.5 font-bold">Resident Note</th>
              <th className="p-2.5 font-bold">Proposed Lux3D Fix</th>
              <th className="p-2.5 font-bold">Coords [x, y, z]</th>
              <th className="p-2.5 text-right font-bold">Est. Cost</th>
              <th className="p-2.5 text-right font-bold">Households</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((pin) => (
              <tr key={pin.id} className="border-b border-[#EAE9E4] align-top">
                <td className="p-2.5">
                  <div className="font-bold">{pin.title}</div>
                  <div className="text-[11px] text-[#6E7570]">
                    {pin.category} · {pin.locationLabel}
                  </div>
                </td>
                <td className="p-2.5 text-[#4A504C]">{pin.residentNote}</td>
                <td className="p-2.5 text-[#4A504C]">
                  <div>{pin.proposedFix}</div>
                  <div className="tabular-mono mt-0.5 text-[10px] text-[#6E7570]">
                    Source: {pin.source ?? 'preset'}
                  </div>
                </td>
                <td className="tabular-mono p-2.5 text-[10px]">
                  [{pin.position.join(', ')}]
                </td>
                <td className="tabular-mono p-2.5 text-right font-semibold">
                  {formatNgn(pin.estimatedCostNgn)}
                </td>
                <td className="tabular-mono p-2.5 text-right font-semibold">
                  {pin.householdsImpacted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 border-t border-[#EAE9E4] pt-3 text-[11px] text-[#6E7570]">
        Note: Cost figures in Naira (₦) and household reach are preliminary
        community planning estimates for Lagos informal settlement co-design
        discussions.
      </p>
    </section>
  );
}
