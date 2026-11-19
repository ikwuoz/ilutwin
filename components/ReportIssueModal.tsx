'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Droplets,
  Footprints,
  Loader2,
  MapPin,
  Sparkles,
  Sun,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import {
  REPORT_ISSUE_TEMPLATES,
  type CommunityProblemPin,
  type ReportIssueType,
} from '@/lib/data/upgrades';
import {
  generateLux3DAsset,
  type Lux3DProgressUpdate,
} from '@/lib/services/aholoService';

interface ReportIssueModalProps {
  open: boolean;
  coords: [number, number, number] | null;
  onClose: () => void;
  onPinCreated: (pin: CommunityProblemPin, notice?: string) => void;
}

const ISSUE_ICONS: Record<ReportIssueType, typeof Droplets> = {
  'Open Drain': Droplets,
  'Dark Alley': Sun,
  'Flooded Walkway': Footprints,
  'Custom Prompt': Wand2,
};

export function ReportIssueModal({
  open,
  coords,
  onClose,
  onPinCreated,
}: ReportIssueModalProps) {
  const [selectedType, setSelectedType] =
    useState<ReportIssueType>('Open Drain');
  const [prompt, setPrompt] = useState(REPORT_ISSUE_TEMPLATES[0].defaultPrompt);
  const [residentNote, setResidentNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<Lux3DProgressUpdate | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setGenerating(false);
      setProgress(null);
    }
  }, [open]);

  if (!open || !coords) return null;

  const template =
    REPORT_ISSUE_TEMPLATES.find((t) => t.issueType === selectedType) ??
    REPORT_ISSUE_TEMPLATES[0];

  const handleTypeSelect = (issueType: ReportIssueType) => {
    setSelectedType(issueType);
    const next = REPORT_ISSUE_TEMPLATES.find((t) => t.issueType === issueType);
    if (next) {
      setPrompt(next.defaultPrompt);
    }
  };

  const buildPin = (
    modelPath: string,
    source: 'aholo-lux3d' | 'local-fallback'
  ): CommunityProblemPin => {
    const id = `pin-user-${Date.now()}`;
    const [x, y, z] = coords;
    // Keep the fly-to camera inside the open street corridor so neighboring props never block the view.
    const camX = x > 0.35 ? Math.max(0.1, x - 0.85) : Math.min(0.75, x + 0.85);
    const camZ = Math.min(2.3, Number((z + 3.0).toFixed(2)));
    const labelTitle =
      selectedType === 'Custom Prompt'
        ? prompt.trim().slice(0, 28) || template.title
        : template.title;

    return {
      id,
      title: labelTitle,
      locationLabel: `Pinned (${x}, ${z})`,
      category: template.category,
      severity: 'high',
      residentNote: residentNote.trim()
        ? `"${residentNote.trim()}"`
        : template.defaultResidentNote,
      proposedFix:
        selectedType === 'Custom Prompt'
          ? prompt.trim()
          : template.proposedFix,
      impactMetric: template.impactMetric,
      unitKind: template.unitKind,
      unitAmount: template.unitAmount,
      estimatedCostNgn: template.estimatedCostNgn,
      householdsImpacted: template.householdsImpacted,
      position: [x, y, z],
      modelScale: 0.68,
      cameraPosition: [Number(camX.toFixed(2)), Number((y + 1.85).toFixed(2)), camZ],
      cameraTarget: [x, Number((y + 0.45).toFixed(2)), z],
      modelPath,
      fallbackKind: template.fallbackKind,
      lux3dPrompt: prompt.trim(),
      isUserCreated: true,
      source,
    };
  };

  const handleInstantPlace = () => {
    if (generating) {
      abortRef.current?.abort();
      return;
    }
    const pin = buildPin(template.fallbackModelPath, 'local-fallback');
    onPinCreated(pin, 'Placed instant catalog upgrade at your pin.');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generating) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setProgress({
      stage: 'submitting',
      message: 'Connecting to Aholo Lux3D (G1-Turbo)…',
      elapsedMs: 0,
    });

    const result = await generateLux3DAsset(prompt, {
      fallbackModelPath: template.fallbackModelPath,
      signal: controller.signal,
      onProgress: (update) => setProgress(update),
    });

    setGenerating(false);
    abortRef.current = null;

    const pin = buildPin(result.modelUrl, result.source);
    const notice =
      result.source === 'aholo-lux3d'
        ? `Generated live Lux3D GLB (Task #${result.taskId}).`
        : result.fallbackReason;

    onPinCreated(pin, notice);
  };

  const elapsedSec = progress ? Math.round(progress.elapsedMs / 1000) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--hud-border-light)] bg-[#F2F2EF] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--hud-border-subtle)] bg-white px-5 py-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#C85A32]">
              <MapPin className="h-3.5 w-3.5" />
              Report Issue &amp; Generate Upgrade
            </div>
            <p className="tabular-mono mt-0.5 text-[11px] text-[#6E7570]">
              Street Coordinates: [{coords[0]}, {coords[1]}, {coords[2]}]
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="hud-transition inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--hud-border-subtle)] bg-[#F2F2EF] text-[#4A504C] hover:bg-[#EAE9E4] hover:text-[#111312]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 p-5">
          {/* Issue Type Picker */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6E7570]">
              1. Issue at this spot
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {REPORT_ISSUE_TEMPLATES.map((item) => {
                const Icon = ISSUE_ICONS[item.issueType];
                const active = item.issueType === selectedType;
                return (
                  <button
                    key={item.issueType}
                    type="button"
                    disabled={generating}
                    onClick={() => handleTypeSelect(item.issueType)}
                    className={`hud-transition flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold active:scale-[0.98] disabled:opacity-60 ${active
                      ? 'border-[#111312] bg-[#111312] text-white'
                      : 'border-[var(--hud-border-subtle)] bg-white text-[#111312] hover:border-[var(--hud-border-light)] hover:bg-[#EAE9E4]/60'
                      }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-[#10B954]' : 'text-[#4A504C]'
                        }`}
                    />
                    <span className="truncate">{item.issueType}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lux3D Prompt */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6E7570]">
              2. Aholo Lux3D Prompt
            </label>
            <textarea
              rows={3}
              disabled={generating}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. elevated concrete pedestrian bridge"
              className="mt-1.5 w-full rounded-xl border border-[var(--hud-border-subtle)] bg-white px-3 py-2 text-xs leading-relaxed text-[#111312] transition focus:border-[#111312] focus:outline-none disabled:opacity-70"
            />
          </div>

          {/* Optional Resident Note */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6E7570]">
              3. Resident Note (optional)
            </label>
            <input
              type="text"
              disabled={generating}
              value={residentNote}
              onChange={(e) => setResidentNote(e.target.value)}
              placeholder="e.g. Water blocks schoolchildren every morning"
              className="mt-1.5 w-full rounded-xl border border-[var(--hud-border-subtle)] bg-white px-3 py-2 text-xs text-[#111312] transition focus:border-[#111312] focus:outline-none disabled:opacity-70"
            />
          </div>

          {/* Progress indicator while generating */}
          {generating && progress && (
            <div className="rounded-xl border border-[var(--hud-border-subtle)] bg-white p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#111312]">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1B6E2D]" />
                  {progress.message}
                </span>
                <span className="tabular-mono text-[11px] text-[#6E7570]">
                  {elapsedSec}s
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EAE9E4]">
                <div
                  className="h-full rounded-full bg-[#10B954] transition-all duration-500"
                  style={{
                    width: `${Math.min(92, 18 + elapsedSec * 2.5)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              type="submit"
              disabled={generating || !prompt.trim()}
              className="hud-transition inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#111312] bg-[#10B954] px-4 py-2.5 text-xs font-bold text-[#111312] hover:bg-[#0EA349] active:scale-[0.98] disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating GLB…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate with Lux3D
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleInstantPlace}
              className="hud-transition inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--hud-border-light)] bg-white px-4 py-2.5 text-xs font-semibold text-[#111312] hover:bg-[#EAE9E4] active:scale-[0.98]"
            >
              <Zap className="h-3.5 w-3.5 text-[#1B6E2D]" />
              {generating ? 'Use Catalog Now' : 'Instant Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
