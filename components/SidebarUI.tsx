'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IluTwinMark } from '@/components/IluTwinMark';
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Droplets,
  Eye,
  EyeOff,
  Footprints,
  Lock,
  MapPin,
  MessageSquareQuote,
  Move,
  Printer,
  RotateCcw,
  Scaling,
  Sparkles,
  Sun,
  Trash2,
  Unlock,
  UploadCloud,
  Wand2,
  Wrench,
} from 'lucide-react';
import {
  formatNgn,
  type CivicImpactSummary,
  type CommunityProblemPin,
  type PinCategory,
  type TransformOverride,
  type ViewMode,
} from '@/lib/data/upgrades';

interface SidebarUIProps {
  pins: CommunityProblemPin[];
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  selectedPinId: string | null;
  onSelectPin: (pin: CommunityProblemPin | null) => void;
  activeHotspotIds: string[];
  onToggleHotspot: (pinId: string) => void;
  onToggleAllHotspots: (enable: boolean) => void;
  onResetCamera: () => void;
  splatStatus: 'checking' | 'loaded' | 'fallback';
  dropPinMode: boolean;
  notice?: string | null;
  impactSummary: CivicImpactSummary;
  onExportJson: () => void;
  onPrintSummary: () => void;
  devTransformEnabled: boolean;
  onToggleDevTransform: () => void;
  transformMode: 'translate' | 'scale';
  onChangeTransformMode: (mode: 'translate' | 'scale') => void;
  transformOverrides: Record<string, TransformOverride>;
  onUpdateTransform: (pinId: string, next: TransformOverride) => void;
  onResetPinTransform: (pinId: string) => void;
  onToggleLockPin: (pinId: string) => void;
  customGlbUrl?: string | null;
}

const CATEGORY_ICON: Record<PinCategory, typeof Droplets> = {
  Flooding: Droplets,
  'No Streetlight': Sun,
  'Waste Overflow': Trash2,
  'Open Drain': Droplets,
  'Dark Alley': Sun,
  'Flooded Walkway': Footprints,
  'Custom Upgrade': Wand2,
};

const CATEGORY_DOT: Record<PinCategory, string> = {
  Flooding: 'bg-[#0EA5E9]',
  'No Streetlight': 'bg-[#F59E0B]',
  'Waste Overflow': 'bg-[#E1262D]',
  'Open Drain': 'bg-[#0EA5E9]',
  'Dark Alley': 'bg-[#F59E0B]',
  'Flooded Walkway': 'bg-[#10B954]',
  'Custom Upgrade': 'bg-[#8B5CF6]',
};

export function SidebarUI({
  pins,
  viewMode,
  onChangeViewMode,
  selectedPinId,
  onSelectPin,
  activeHotspotIds,
  onToggleHotspot,
  onToggleAllHotspots,
  onResetCamera,
  splatStatus,
  dropPinMode,
  notice,
  impactSummary,
  onExportJson,
  onPrintSummary,
  devTransformEnabled,
  onToggleDevTransform,
  transformMode,
  onChangeTransformMode,
  transformOverrides,
  onUpdateTransform,
  onResetPinTransform,
  onToggleLockPin,
  customGlbUrl,
}: SidebarUIProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedPin = pins.find((p) => p.id === selectedPinId) ?? null;
  const isSelectedLocked = selectedPin
    ? Boolean(transformOverrides[selectedPin.id]?.locked)
    : false;
  const allEnabled = pins.length > 0 && activeHotspotIds.length === pins.length;

  const activePos = selectedPin
    ? (transformOverrides[selectedPin.id]?.position ?? selectedPin.position)
    : null;
  const activeScale = selectedPin
    ? (transformOverrides[selectedPin.id]?.modelScale ?? selectedPin.modelScale)
    : null;
  const activeRotationY = selectedPin
    ? (transformOverrides[selectedPin.id]?.rotationY ??
      selectedPin.rotation?.[1] ??
      selectedPin.rotationY ??
      0)
    : 0;

  const handleCopyCoords = async () => {
    if (!selectedPin || !activePos || activeScale === null) return;
    const rotLine =
      Math.abs(activeRotationY) > 0.001
        ? `\nrotationY: ${Math.round(activeRotationY * 1000) / 1000},`
        : '';
    const snippet = `position: [${activePos.join(', ')}],\nmodelScale: ${activeScale},${rotLine}`;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedId(selectedPin.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard may be blocked in insecure contexts
    }
  };

  const upgradePills: string[] = [];
  if (impactSummary.counts.solarLamps > 0) {
    upgradePills.push(
      `${impactSummary.counts.solarLamps} Solar ${
        impactSummary.counts.solarLamps === 1 ? 'Lamp' : 'Lamps'
      }`
    );
  }
  if (impactSummary.counts.drainageMeters > 0) {
    upgradePills.push(`${impactSummary.counts.drainageMeters}m Drain`);
  }
  if (impactSummary.counts.wasteHubs > 0) {
    upgradePills.push(
      `${impactSummary.counts.wasteHubs} Waste ${
        impactSummary.counts.wasteHubs === 1 ? 'Hub' : 'Hubs'
      }`
    );
  }
  if (impactSummary.counts.walkwayMeters > 0) {
    upgradePills.push(`${impactSummary.counts.walkwayMeters}m Walkway`);
  }
  if (impactSummary.counts.customUnits > 0) {
    upgradePills.push(`${impactSummary.counts.customUnits} Custom`);
  }

  if (collapsed) {
    return (
      <div className="pointer-events-auto absolute top-4 left-4 z-20">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="hud-glass hud-transition inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold text-[#111312] active:scale-[0.98]"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              viewMode === 'upgrade' ? 'bg-[#10B954]' : 'bg-[#C85A32]'
            }`}
          />
          <span>
            ÌlúTwin · {viewMode === 'upgrade' ? 'Lux3D' : 'Baseline'}
          </span>
          <span className="tabular-mono rounded-full bg-[#EAE9E4] px-1.5 py-0.5 text-[10px] font-bold text-[#4A504C]">
            {activeHotspotIds.length}/{pins.length}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-[#6E7570]" />
        </button>
      </div>
    );
  }

  return (
    <aside className="hud-glass pointer-events-auto absolute top-3 right-3 left-3 z-20 flex max-h-[calc(100%-82px)] flex-col overflow-hidden rounded-2xl sm:top-4 sm:right-auto sm:bottom-4 sm:left-4 sm:max-h-[calc(100%-32px)] sm:w-[360px] sm:max-w-[360px]">
      {/* Header: Branding + Pilot Location Badge */}
      <div className="border-b border-[var(--hud-border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IluTwinMark className="h-6 w-6 shrink-0" />
            <h1 className="text-sm font-extrabold tracking-tight text-[#111312]">
              ÌlúTwin
            </h1>
            <span className="rounded-full border border-[var(--hud-border-subtle)] bg-[#EEEDE9] px-2 py-0.5 text-[10px] font-semibold text-[#4A504C]">
              3D Civic HUD
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onResetCamera}
              title="Reset camera to Overview (1)"
              className="hud-transition inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--hud-border-subtle)] bg-white/80 text-[#4A504C] hover:border-[var(--hud-border-light)] hover:bg-white hover:text-[#111312] active:scale-[0.96]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Collapse panel"
              className="hud-transition inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--hud-border-subtle)] bg-white/80 text-[#4A504C] hover:border-[var(--hud-border-light)] hover:bg-white hover:text-[#111312] active:scale-[0.96]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Live street location badge */}
        <div className="mt-2 flex items-center justify-between rounded-xl border border-[var(--hud-border-subtle)] bg-white/75 px-2.5 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#111312]">
            <MapPin className="h-3 w-3 text-[#C85A32]" />
            Lagos Residential Street
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#4A504C]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                splatStatus === 'loaded' ? 'bg-[#10B954]' : 'bg-[#6E7570]'
              }`}
            />
            <span className="tabular-mono">
              {splatStatus === 'loaded' ? 'Aholo 3DGS' : 'Procedural'}
            </span>
          </span>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {/* Segmented Pill Toggle: Current Reality vs Lux3D Upgrade */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6E7570]">
              View Mode
            </span>
            <span className="tabular-mono rounded border border-[var(--hud-border-subtle)] bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-[#4A504C]">
              Key V
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--hud-border-subtle)] bg-[#EEEDE9] p-1">
            <button
              type="button"
              onClick={() => onChangeViewMode('current')}
              className={`hud-transition rounded-full px-3 py-1.5 text-xs font-bold active:scale-[0.98] ${
                viewMode === 'current'
                  ? 'bg-[#C85A32] text-white shadow-xs'
                  : 'text-[#4A504C] hover:text-[#111312]'
              }`}
            >
              Current Reality
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('upgrade')}
              className={`hud-transition inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold active:scale-[0.98] ${
                viewMode === 'upgrade'
                  ? 'bg-[#111312] text-white shadow-xs'
                  : 'text-[#4A504C] hover:text-[#111312]'
              }`}
            >
              <Sparkles className="h-3 w-3 text-[#10B954]" />
              Lux3D Upgrade
            </button>
          </div>
        </div>

        {/* Active Drop-Pin Guidance Banner */}
        {dropPinMode && (
          <div className="rounded-xl border border-[#C85A32]/40 bg-[#C85A32]/10 px-3 py-2 text-[11px] font-semibold text-[#9A3D1D]">
            Pin Drop Active — click anywhere on the 3D street to place a marker
            &amp; generate a Lux3D fix.
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-[#1B6E2D]/30 bg-[#1B6E2D]/10 px-3 py-2 text-[11px] font-medium text-[#1B6E2D]">
            {notice}
          </div>
        )}

        {/* Compact Community Impact Summary */}
        <div className="rounded-xl border border-[var(--hud-border-subtle)] bg-white/95 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#1B6E2D]">
              <BarChart3 className="h-3.5 w-3.5" />
              Civic Impact
            </span>
            <span className="text-[10px] font-semibold text-[#6E7570]">
              Est. Local Cost
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2.5 py-2">
              <div className="tabular-mono text-sm font-bold text-[#111312]">
                {formatNgn(impactSummary.totalCostNgn)}
              </div>
              <div className="text-[10px] font-medium text-[#6E7570]">
                Deployment Cost
              </div>
            </div>
            <div className="rounded-lg border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2.5 py-2">
              <div className="tabular-mono text-sm font-bold text-[#1B6E2D]">
                {impactSummary.householdsImpacted}
              </div>
              <div className="text-[10px] font-medium text-[#6E7570]">
                Households Reached
              </div>
            </div>
          </div>

          {viewMode === 'upgrade' ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {upgradePills.length > 0 ? (
                upgradePills.map((label) => (
                  <span
                    key={label}
                    className="tabular-mono rounded-full border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2 py-0.5 text-[10px] font-semibold text-[#111312]"
                  >
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[#6E7570]">
                  No upgrade props toggled on.
                </span>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-[#6E7570]">
              Planned package:{' '}
              <span className="tabular-mono font-bold text-[#111312]">
                {formatNgn(impactSummary.plannedCostNgn)}
              </span>{' '}
              ·{' '}
              <span className="tabular-mono font-semibold">
                {impactSummary.plannedHouseholdsImpacted}
              </span>{' '}
              hh
            </p>
          )}

          <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-[var(--hud-border-subtle)] pt-2">
            <button
              type="button"
              onClick={onExportJson}
              className="hud-transition inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--hud-border-light)] bg-[#F2F2EF] px-2.5 py-1.5 text-[11px] font-semibold text-[#111312] hover:bg-[#EAE9E4] active:scale-[0.98]"
            >
              <Download className="h-3 w-3 text-[#0F4C4C]" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={onPrintSummary}
              className="hud-transition inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--hud-border-light)] bg-[#F2F2EF] px-2.5 py-1.5 text-[11px] font-semibold text-[#111312] hover:bg-[#EAE9E4] active:scale-[0.98]"
            >
              <Printer className="h-3 w-3 text-[#C85A32]" />
              Print Brief
            </button>
          </div>
        </div>

        {/* Scannable Hotspot Cards */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6E7570]">
              Hotspots ({pins.length})
            </span>
            {viewMode === 'upgrade' && (
              <button
                type="button"
                onClick={() => onToggleAllHotspots(!allEnabled)}
                className="text-[11px] font-semibold text-[#1B6E2D] hover:underline"
              >
                {allEnabled ? 'Hide all' : 'Show all'}
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {pins.map((pin) => {
              const Icon = CATEGORY_ICON[pin.category];
              const isSelected = pin.id === selectedPinId;
              const isHotspotOn = activeHotspotIds.includes(pin.id);

              return (
                <div
                  key={pin.id}
                  className={`hud-transition rounded-xl border ${
                    isSelected
                      ? 'border-[#111312]/40 bg-white shadow-sm'
                      : 'border-[var(--hud-border-subtle)] bg-white/80 hover:border-[var(--hud-border-light)] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 p-2.5">
                    <button
                      type="button"
                      onClick={() => onSelectPin(isSelected ? null : pin)}
                      className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? 'bg-[#111312] text-white'
                            : 'bg-[#EAE9E4] text-[#0F4C4C]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              viewMode === 'upgrade' && isHotspotOn
                                ? 'bg-[#10B954]'
                                : CATEGORY_DOT[pin.category]
                            }`}
                          />
                          <span className="truncate text-[10px] font-bold uppercase tracking-wider text-[#4A504C]">
                            {pin.category}
                          </span>
                          {pin.isUserCreated && (
                            <span className="rounded bg-[#5B21B6]/10 px-1 py-0.5 text-[9px] font-bold uppercase text-[#5B21B6]">
                              New
                            </span>
                          )}
                          {transformOverrides[pin.id]?.locked && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-[#B45309]/10 px-1 py-0.5 text-[9px] font-bold uppercase text-[#B45309]">
                              <Lock className="h-2.5 w-2.5" />
                              Locked
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs font-bold text-[#111312]">
                          {pin.title}
                        </p>
                        <div className="tabular-mono mt-0.5 flex items-center gap-2 text-[10px] font-medium text-[#6E7570]">
                          <span className="font-semibold text-[#1B6E2D]">
                            {formatNgn(pin.estimatedCostNgn)}
                          </span>
                          <span>·</span>
                          <span>{pin.householdsImpacted} hh</span>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={viewMode === 'current'}
                      onClick={() => onToggleHotspot(pin.id)}
                      title={
                        viewMode === 'current'
                          ? 'Switch to Lux3D Upgrade to toggle props'
                          : isHotspotOn
                            ? 'Hide Lux3D prop'
                            : 'Show Lux3D prop'
                      }
                      className={`hud-transition inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 ${
                        viewMode === 'upgrade' && isHotspotOn
                          ? 'bg-[#1B6E2D] text-white'
                          : 'bg-[#EAE9E4] text-[#4A504C] hover:bg-[#DFDDD6]'
                      }`}
                    >
                      {viewMode === 'upgrade' && isHotspotOn ? (
                        <>
                          <Eye className="h-3 w-3" />
                          On
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Off
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Hotspot Resident Note & Fix */}
        {selectedPin && (
          <div className="rounded-xl border border-[var(--hud-border-subtle)] bg-white/95 p-3 text-xs shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C85A32]">
                <MessageSquareQuote className="h-3.5 w-3.5" />
                Resident Note
              </span>
              <span className="tabular-mono rounded-full bg-[#1B6E2D]/10 px-2 py-0.5 text-[10px] font-bold text-[#1B6E2D]">
                {selectedPin.impactMetric}
              </span>
            </div>
            <p className="mt-1 leading-relaxed text-[#4A504C]">
              {selectedPin.residentNote}
            </p>

            <div className="mt-2 border-t border-[var(--hud-border-subtle)] pt-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C4C]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Lux3D Intervention
              </span>
              <p className="mt-0.5 leading-relaxed text-[#4A504C]">
                {selectedPin.proposedFix}
              </p>
              <p className="tabular-mono mt-1 truncate text-[10px] text-[#6E7570]">
                {selectedPin.modelPath}
              </p>
            </div>
          </div>
        )}

        {/* Prop Placement & Position Lock HUD */}
        {selectedPin && viewMode === 'upgrade' && activePos && activeScale !== null && (
          <div
            className={`rounded-xl border p-3 text-xs ${
              isSelectedLocked
                ? 'border-[#B45309]/40 bg-[#B45309]/5'
                : 'border-dashed border-[#0F4C4C]/40 bg-[#0F4C4C]/5'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-[#0F4C4C]">
                <Wrench className="h-3.5 w-3.5" />
                Prop Placement
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleLockPin(selectedPin.id)}
                  title="Shortcut: L"
                  className={`hud-transition inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${
                    isSelectedLocked
                      ? 'bg-[#B45309] text-white hover:bg-[#92400E]'
                      : 'bg-[#1B6E2D] text-white hover:bg-[#155724]'
                  }`}
                >
                  {isSelectedLocked ? (
                    <>
                      <Unlock className="h-3 w-3" />
                      Unlock
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      Lock
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onToggleDevTransform}
                  className={`hud-transition rounded-lg px-2 py-1 text-[10px] font-bold ${
                    devTransformEnabled
                      ? 'bg-[#0F4C4C] text-white'
                      : 'bg-white text-[#0F4C4C] ring-1 ring-[#0F4C4C]/30'
                  }`}
                >
                  {devTransformEnabled ? 'Hide' : 'Adjust'}
                </button>
              </div>
            </div>

            <p className="mt-1.5 text-[10px] text-[#4A504C]">
              {isSelectedLocked ? (
                <>
                  Position locked (<code className="font-mono">[L]</code> to
                  unlock). Orbit safely without moving prop.
                </>
              ) : (
                <>
                  Click &amp; drag prop in 3D (<code className="font-mono">Shift</code>
                  +drag height), then <strong>Lock</strong> (<code className="font-mono">L</code>).
                </>
              )}
            </p>

            {devTransformEnabled && (
              <div className="mt-2.5 space-y-2">
                {splatStatus !== 'loaded' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={isSelectedLocked}
                      onClick={() => onChangeTransformMode('translate')}
                      className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold disabled:opacity-45 ${
                        transformMode === 'translate'
                          ? 'bg-[#C85A32] text-white'
                          : 'bg-white text-[#4A504C]'
                      }`}
                    >
                      <Move className="h-3 w-3" />
                      Move (G)
                    </button>
                    <button
                      type="button"
                      disabled={isSelectedLocked}
                      onClick={() => onChangeTransformMode('scale')}
                      className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold disabled:opacity-45 ${
                        transformMode === 'scale'
                          ? 'bg-[#C85A32] text-white'
                          : 'bg-white text-[#4A504C]'
                      }`}
                    >
                      <Scaling className="h-3 w-3" />
                      Scale (S)
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 rounded-lg bg-white p-2 text-[10px] text-[#111312]">
                  {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                    <div
                      key={axis}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="tabular-mono font-bold text-[#6E7570]">
                        {axis}: {activePos[idx]}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isSelectedLocked}
                          onClick={() => {
                            const nextPos: [number, number, number] = [
                              ...activePos,
                            ];
                            nextPos[idx] =
                              Math.round((nextPos[idx] - 0.25) * 100) / 100;
                            onUpdateTransform(selectedPin.id, {
                              position: nextPos,
                              modelScale: activeScale,
                              rotationY: activeRotationY,
                              locked: isSelectedLocked,
                            });
                          }}
                          className="rounded border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2 py-0.5 font-bold hover:bg-[#EAE9E4] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          -0.25
                        </button>
                        <button
                          type="button"
                          disabled={isSelectedLocked}
                          onClick={() => {
                            const nextPos: [number, number, number] = [
                              ...activePos,
                            ];
                            nextPos[idx] =
                              Math.round((nextPos[idx] + 0.25) * 100) / 100;
                            onUpdateTransform(selectedPin.id, {
                              position: nextPos,
                              modelScale: activeScale,
                              rotationY: activeRotationY,
                              locked: isSelectedLocked,
                            });
                          }}
                          className="rounded border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2 py-0.5 font-bold hover:bg-[#EAE9E4] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          +0.25
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--hud-border-subtle)] pt-1.5">
                    <span className="tabular-mono font-bold text-[#6E7570]">
                      Scale: {activeScale}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isSelectedLocked}
                        onClick={() =>
                          onUpdateTransform(selectedPin.id, {
                            position: activePos,
                            modelScale: Math.max(
                              0.15,
                              Math.round((activeScale - 0.1) * 100) / 100
                            ),
                            rotationY: activeRotationY,
                            locked: isSelectedLocked,
                          })
                        }
                        className="rounded border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2 py-0.5 font-bold hover:bg-[#EAE9E4] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        -0.1
                      </button>
                      <button
                        type="button"
                        disabled={isSelectedLocked}
                        onClick={() =>
                          onUpdateTransform(selectedPin.id, {
                            position: activePos,
                            modelScale:
                              Math.round((activeScale + 0.1) * 100) / 100,
                            rotationY: activeRotationY,
                            locked: isSelectedLocked,
                          })
                        }
                        className="rounded border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2 py-0.5 font-bold hover:bg-[#EAE9E4] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        +0.1
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--hud-border-subtle)] pt-1.5">
                    <span className="tabular-mono font-bold text-[#6E7570]">
                      Rot Y: {Math.round((activeRotationY * 180) / Math.PI)}°
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isSelectedLocked}
                        onClick={() =>
                          onUpdateTransform(selectedPin.id, {
                            position: activePos,
                            modelScale: activeScale,
                            rotationY: activeRotationY - Math.PI / 12,
                            locked: isSelectedLocked,
                          })
                        }
                        className="rounded border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2 py-0.5 font-bold hover:bg-[#EAE9E4] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        -15°
                      </button>
                      <button
                        type="button"
                        disabled={isSelectedLocked}
                        onClick={() =>
                          onUpdateTransform(selectedPin.id, {
                            position: activePos,
                            modelScale: activeScale,
                            rotationY: activeRotationY + Math.PI / 12,
                            locked: isSelectedLocked,
                          })
                        }
                        className="rounded border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2 py-0.5 font-bold hover:bg-[#EAE9E4] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        +15°
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#1B6E2D] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#155724]"
                  >
                    {copiedId === selectedPin.id ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy Coords
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onResetPinTransform(selectedPin.id)}
                    className="rounded-lg border border-[var(--hud-border-light)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4A504C] hover:bg-[#EAE9E4]"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {customGlbUrl && (
          <div className="rounded-xl border border-[#1B6E2D]/30 bg-[#1B6E2D]/10 p-3 text-xs text-[#1B6E2D]">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              Lux3D Custom Asset Loaded
            </div>
            <p className="tabular-mono mt-1 truncate text-[10px] opacity-90">
              {customGlbUrl}
            </p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-[var(--hud-border-subtle)] bg-white/65 px-4 py-2.5">
        <Link
          href="/upload"
          className="hud-transition inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#111312] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1B6E2D] active:scale-[0.98]"
        >
          <UploadCloud className="h-3.5 w-3.5" />
          Upload Street or Generate Asset
        </Link>
      </div>
    </aside>
  );
}
