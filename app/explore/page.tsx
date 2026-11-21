'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Camera, Plus, X } from 'lucide-react';
import { PrintablePlannerBrief } from '@/components/PrintablePlannerBrief';
import { ReportIssueModal } from '@/components/ReportIssueModal';
import { SidebarUI } from '@/components/SidebarUI';
import {
  CAMERA_PRESETS,
  COMMUNITY_PROBLEM_PINS,
  getInstanceOverrideKey,
  getPinInstances,
  parseInstanceOverrideKey,
  summarizeCivicImpact,
  type CameraPreset,
  type CommunityProblemPin,
  type TransformMode,
  type TransformOverride,
  type ViewMode,
} from '@/lib/data/upgrades';

const PROP_TRANSFORMS_STORAGE_KEY = 'ilutwin.propTransforms.v2';

const ExploreViewer = dynamic(
  () => import('@/components/ExploreViewer').then((m) => m.ExploreViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#EAE5DC] text-sm font-medium text-[#4A504C]">
        Initializing 3D Canvas…
      </div>
    ),
  }
);

function ExploreContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');
  const initialViewMode: ViewMode =
    modeParam === 'upgrade' ? 'upgrade' : 'current';
  const glbUrl = searchParams.get('glb');
  const splatUrl = searchParams.get('splat');

  const [pins, setPins] = useState<CommunityProblemPin[]>(
    COMMUNITY_PROBLEM_PINS
  );
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedInstanceKey, setSelectedInstanceKey] = useState<string | null>(
    null
  );
  const [activeHotspotIds, setActiveHotspotIds] = useState<string[]>(() =>
    COMMUNITY_PROBLEM_PINS.map((p) => p.id)
  );
  const [activePresetId, setActivePresetId] = useState<
    CameraPreset['id'] | null
  >('overview');
  const [cameraGoal, setCameraGoal] = useState<{
    position: [number, number, number];
    target: [number, number, number];
    seq: number;
  } | null>(null);
  const [splatStatus, setSplatStatus] = useState<
    'checking' | 'loaded' | 'fallback'
  >('checking');

  // Community Co-Design: Drop New Pin state
  const [dropPinMode, setDropPinMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<
    [number, number, number] | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState('');

  // Prop alignment state
  const [devTransformEnabled, setDevTransformEnabled] = useState(false);
  const [transformMode, setTransformMode] =
    useState<TransformMode>('translate');
  const [transformOverrides, setTransformOverrides] = useState<
    Record<string, TransformOverride>
  >({});
  const [transformsHydrated, setTransformsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PROP_TRANSFORMS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, TransformOverride>;
        if (parsed && typeof parsed === 'object') {
          setTransformOverrides(parsed);
        }
      }
    } catch {
      // Ignore storage read failures
    } finally {
      setTransformsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!transformsHydrated) return;
    try {
      window.localStorage.setItem(
        PROP_TRANSFORMS_STORAGE_KEY,
        JSON.stringify(transformOverrides)
      );
    } catch {
      // Ignore storage write failures
    }
  }, [transformOverrides, transformsHydrated]);

  const impactSummary = useMemo(
    () => summarizeCivicImpact(pins, activeHotspotIds, viewMode),
    [pins, activeHotspotIds, viewMode]
  );

  const flyTo = useCallback(
    (position: [number, number, number], target: [number, number, number]) => {
      setCameraGoal((prev) => ({
        position,
        target,
        seq: (prev?.seq ?? 0) + 1,
      }));
    },
    []
  );

  const handleSelectPreset = useCallback(
    (preset: CameraPreset) => {
      setActivePresetId(preset.id);
      setSelectedPinId(preset.pinId ?? null);
      setSelectedInstanceKey(
        preset.pinId ? getInstanceOverrideKey(preset.pinId, '0') : null
      );
      flyTo(preset.position, preset.target);
    },
    [flyTo]
  );

  const handleToggleLockPin = useCallback(
    (instanceKey: string) => {
      const { pinId, instanceId } = parseInstanceOverrideKey(instanceKey);
      const pin = pins.find((p) => p.id === pinId);
      if (!pin) return;
      const inst =
        getPinInstances(pin).find((i) => i.id === instanceId) ??
        getPinInstances(pin)[0];
      const cur = transformOverrides[instanceKey];
      const nextLocked = !(cur?.locked ?? false);
      setTransformOverrides((prev) => {
        const latest = prev[instanceKey];
        const basePos = inst?.position ?? pin.position;
        const baseScale = inst?.modelScale ?? pin.modelScale;
        const baseRotY =
          inst?.rotation?.[1] ??
          inst?.rotationY ??
          pin.rotation?.[1] ??
          pin.rotationY;
        return {
          ...prev,
          [instanceKey]: {
            position: latest?.position ?? basePos,
            modelScale: latest?.modelScale ?? baseScale,
            rotationY: latest?.rotationY ?? baseRotY,
            rotation: latest?.rotation ?? inst?.rotation ?? pin.rotation,
            locked: nextLocked,
          },
        };
      });
      const label = inst?.label ?? pin.title;
      setNotice(
        nextLocked
          ? `Locked ${label} position.`
          : `Unlocked ${label} for dragging & rotation.`
      );
    },
    [pins, transformOverrides]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Pitch camera presets (1-4) and View Mode toggle (V)
      const presetByKey = CAMERA_PRESETS.find((p) => p.shortcut === key);
      if (presetByKey) {
        handleSelectPreset(presetByKey);
        return;
      }
      if (key === 'v') {
        setViewMode((prev) => (prev === 'upgrade' ? 'current' : 'upgrade'));
        return;
      }

      const activeKey =
        selectedInstanceKey ??
        (selectedPinId ? getInstanceOverrideKey(selectedPinId, '0') : null);
      if (key === 'l' && activeKey && viewMode === 'upgrade') {
        handleToggleLockPin(activeKey);
        return;
      }

      // Direct gizmo mode shortcuts in Lux3D Upgrade mode
      if (viewMode === 'upgrade') {
        if (key === 'g' || key === 't') {
          setTransformMode('translate');
        } else if (key === 'r') {
          setTransformMode('rotate');
        } else if (key === 's') {
          setTransformMode('scale');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSelectPreset,
    handleToggleLockPin,
    selectedInstanceKey,
    selectedPinId,
    viewMode,
  ]);

  const handleSelectPin = (
    pin: CommunityProblemPin | null,
    options?: { skipFly?: boolean; instanceKey?: string }
  ) => {
    setSelectedPinId(pin?.id ?? null);
    setSelectedInstanceKey(
      pin
        ? (options?.instanceKey ?? getInstanceOverrideKey(pin.id, '0'))
        : null
    );
    setActivePresetId(null);
    if (pin) {
      if (!activeHotspotIds.includes(pin.id)) {
        setActiveHotspotIds((prev) => [...prev, pin.id]);
      }
      if (!options?.skipFly) {
        flyTo(pin.cameraPosition, pin.cameraTarget);
      }
    }
  };

  const handleToggleHotspot = (pinId: string) => {
    setActiveHotspotIds((prev) =>
      prev.includes(pinId)
        ? prev.filter((id) => id !== pinId)
        : [...prev, pinId]
    );
  };

  const handleToggleAllHotspots = (enable: boolean) => {
    setActiveHotspotIds(enable ? pins.map((p) => p.id) : []);
  };

  const handleResetCamera = () => {
    handleSelectPreset(CAMERA_PRESETS[0]);
  };

  const handleDropPinAt = useCallback((coords: [number, number, number]) => {
    setPendingCoords(coords);
    setDropPinMode(false);
  }, []);

  const handlePinCreated = useCallback(
    (newPin: CommunityProblemPin, message?: string) => {
      setPins((prev) => [...prev, newPin]);
      setActiveHotspotIds((prev) => [...prev, newPin.id]);
      setSelectedPinId(newPin.id);
      setActivePresetId(null);
      setViewMode('upgrade');
      setPendingCoords(null);
      flyTo(newPin.cameraPosition, newPin.cameraTarget);
      if (message) {
        setNotice(message);
      }
    },
    [flyTo]
  );

  const handleExportJson = useCallback(() => {
    const payload = {
      project: 'ÌlúTwin Lagos Community Digital Twin',
      generatedAt: new Date().toISOString(),
      viewMode,
      summary: {
        activeUpgradesCount: impactSummary.activeCount,
        estimatedDeploymentCostNgn: impactSummary.totalCostNgn,
        householdsImpacted: impactSummary.householdsImpacted,
        breakdown: impactSummary.counts,
      },
      interventions: (viewMode === 'upgrade'
        ? impactSummary.activePins
        : impactSummary.plannedPins
      ).map((pin) => ({
        id: pin.id,
        title: pin.title,
        category: pin.category,
        locationLabel: pin.locationLabel,
        coordinates: transformOverrides[pin.id]?.position ?? pin.position,
        estimatedCostNgn: pin.estimatedCostNgn,
        householdsImpacted: pin.householdsImpacted,
        residentNote: pin.residentNote,
        proposedFix: pin.proposedFix,
        modelPath: pin.modelPath,
        source: pin.source ?? 'preset',
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ilutwin-planner-report.json';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Exported ilutwin-planner-report.json.');
  }, [impactSummary, transformOverrides, viewMode]);

  const handlePrintSummary = useCallback(() => {
    setGeneratedAt(
      new Date().toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    );
    setTimeout(() => {
      window.print();
    }, 50);
  }, []);

  const handleUpdateTransform = useCallback(
    (pinId: string, next: TransformOverride) => {
      setTransformOverrides((prev) => ({
        ...prev,
        [pinId]: next,
      }));
    },
    []
  );

  const handleResetPinTransform = useCallback((pinId: string) => {
    setTransformOverrides((prev) => {
      const copy = { ...prev };
      delete copy[pinId];
      return copy;
    });
  }, []);

  const handleSplatStatusChange = useCallback(
    (status: 'checking' | 'loaded' | 'fallback') => {
      setSplatStatus(status);
    },
    []
  );

  return (
    <>
      <div className="relative h-[calc(100dvh-56px)] min-h-[540px] w-full overflow-hidden print:hidden">
        <ExploreViewer
          pins={pins}
          viewMode={viewMode}
          selectedPinId={selectedPinId}
          selectedInstanceKey={selectedInstanceKey}
          onSelectPin={handleSelectPin}
          activeHotspotIds={activeHotspotIds}
          cameraGoal={cameraGoal}
          dropPinMode={dropPinMode}
          onDropPinAt={handleDropPinAt}
          devTransformEnabled={devTransformEnabled}
          transformMode={transformMode}
          onChangeTransformMode={setTransformMode}
          transformOverrides={transformOverrides}
          onUpdateTransform={handleUpdateTransform}
          onToggleLockKey={handleToggleLockPin}
          onResetTransformKey={handleResetPinTransform}
          customGlbUrl={glbUrl}
          customSplatUrl={splatUrl}
          onSplatStatusChange={handleSplatStatusChange}
        />

        <SidebarUI
          pins={pins}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          selectedPinId={selectedPinId}
          selectedInstanceKey={selectedInstanceKey}
          onSelectPin={handleSelectPin}
          activeHotspotIds={activeHotspotIds}
          onToggleHotspot={handleToggleHotspot}
          onToggleAllHotspots={handleToggleAllHotspots}
          onResetCamera={handleResetCamera}
          splatStatus={splatStatus}
          dropPinMode={dropPinMode}
          notice={notice}
          impactSummary={impactSummary}
          onExportJson={handleExportJson}
          onPrintSummary={handlePrintSummary}
          devTransformEnabled={devTransformEnabled}
          onToggleDevTransform={() => setDevTransformEnabled((prev) => !prev)}
          transformMode={transformMode}
          onChangeTransformMode={setTransformMode}
          transformOverrides={transformOverrides}
          onUpdateTransform={handleUpdateTransform}
          onResetPinTransform={handleResetPinTransform}
          onToggleLockPin={handleToggleLockPin}
          customGlbUrl={glbUrl}
        />

        {/* Quick Top-Right Before/After Mode Indicator */}
        <button
          type="button"
          onClick={() =>
            setViewMode((prev) => (prev === 'upgrade' ? 'current' : 'upgrade'))
          }
          title="Press V to toggle Current Reality vs Lux3D Upgrade"
          className="hud-glass hud-transition absolute top-4 right-4 z-20 hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-[#111312] hover:bg-white active:scale-[0.98] md:inline-flex"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              viewMode === 'upgrade' ? 'bg-[#10B954]' : 'bg-[#C85A32]'
            }`}
          />
          <span>
            {viewMode === 'upgrade'
              ? `Lux3D Upgrade · ${impactSummary.activeCount} Props Active`
              : 'Current Reality · Baseline Hazards'}
          </span>
        </button>

        {/* Bottom Floating Camera & Drop-Pin Dock */}
        <div className="pointer-events-none absolute right-3 bottom-3 left-3 z-20 flex justify-center sm:right-4 sm:bottom-4 sm:left-[392px]">
          <div className="hud-glass no-scrollbar pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full p-1.5">
            <span className="hidden items-center gap-1 pl-2.5 pr-1 text-[10px] font-bold uppercase tracking-wider text-[#6E7570] lg:inline-flex">
              <Camera className="h-3.5 w-3.5 text-[#1B6E2D]" />
              Views
            </span>

            {CAMERA_PRESETS.map((preset) => {
              const active = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`hud-transition inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-[0.98] ${
                    active
                      ? 'bg-[#0F4C4C] text-white shadow-xs'
                      : 'bg-white/80 text-[#4A504C] hover:bg-white hover:text-[#111312]'
                  }`}
                >
                  <span
                    className={`tabular-mono rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-[#EAE9E4] text-[#6E7570]'
                    }`}
                  >
                    {preset.shortcut}
                  </span>
                  <span>{preset.label}</span>
                </button>
              );
            })}

            <div className="mx-0.5 h-5 w-px shrink-0 bg-[var(--hud-border-light)]" />

            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setDropPinMode((prev) => !prev);
              }}
              className={`hud-transition inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold active:scale-[0.98] ${
                dropPinMode
                  ? 'bg-[#C85A32] text-white shadow-xs'
                  : 'bg-[#111312] text-white hover:bg-[#1B6E2D]'
              }`}
            >
              {dropPinMode ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Cancel Pin
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 text-[#10B954]" />
                  Drop New Pin
                </>
              )}
            </button>
          </div>
        </div>

        <ReportIssueModal
          open={pendingCoords !== null}
          coords={pendingCoords}
          onClose={() => setPendingCoords(null)}
          onPinCreated={handlePinCreated}
        />
      </div>

      {/* Dedicated Printable Community Upgrade Brief */}
      <PrintablePlannerBrief
        viewMode={viewMode}
        summary={impactSummary}
        generatedAt={generatedAt}
      />
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-56px)] items-center justify-center text-sm text-[#4A504C]">
          Loading 3D Explorer…
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
