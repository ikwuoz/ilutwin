'use client';

import { useEffect, useRef, useState } from 'react';
import { AholoSceneViewer } from '@/components/AholoSceneViewer';
import { SceneViewer } from '@/components/SceneViewer';
import {
  SparkSceneViewer,
  type SharedCameraState,
} from '@/components/SparkSceneViewer';
import {
  BASE_STREET_SPLAT_CANDIDATES,
  type CommunityProblemPin,
  type TransformMode,
  type TransformOverride,
  type ViewMode,
} from '@/lib/data/upgrades';

interface ExploreViewerProps {
  pins: CommunityProblemPin[];
  viewMode: ViewMode;
  selectedPinId: string | null;
  selectedInstanceKey: string | null;
  onSelectPin: (
    pin: CommunityProblemPin | null,
    options?: { skipFly?: boolean; instanceKey?: string }
  ) => void;
  activeHotspotIds: string[];
  cameraGoal: {
    position: [number, number, number];
    target: [number, number, number];
    seq: number;
  } | null;
  dropPinMode: boolean;
  onDropPinAt: (coords: [number, number, number]) => void;
  devTransformEnabled: boolean;
  transformMode: TransformMode;
  onChangeTransformMode: (mode: TransformMode) => void;
  transformOverrides: Record<string, TransformOverride>;
  onUpdateTransform: (instanceKey: string, next: TransformOverride) => void;
  onToggleLockKey: (instanceKey: string) => void;
  onResetTransformKey: (instanceKey: string) => void;
  customGlbUrl?: string | null;
  customSplatUrl?: string | null;
  onSplatStatusChange?: (status: 'checking' | 'loaded' | 'fallback') => void;
}

const SPLAT_EXT_RE = /\.(splat|spz|ply|sog)(\?|$)/i;

/**
 * Dual-Engine 3D Explorer:
 * - Current Reality -> @manycore/aholo-viewer (native Aholo 3DGS baseline)
 * - Lux3D Upgrade   -> Three.js + @sparkjsdev/spark (HiDPI PBR, IBL, soft
 *                      shadows, multi-instance corridor props & TransformControls)
 * Both engines share a synced camera state and pause their render loop while
 * inactive so toggling [V] is instant with zero idle GPU overhead.
 */
export function ExploreViewer(props: ExploreViewerProps) {
  const { customSplatUrl, onSplatStatusChange, viewMode } = props;

  const [detectedSplatSrc, setDetectedSplatSrc] = useState<string | null>(null);
  const [aholoError, setAholoError] = useState<string | null>(null);
  const [sparkError, setSparkError] = useState<string | null>(null);
  const [probeDone, setProbeDone] = useState(false);
  const [hasOpenedUpgrade, setHasOpenedUpgrade] = useState(
    viewMode === 'upgrade'
  );

  const sharedCameraRef = useRef<SharedCameraState>({
    position: [0.85, 1.85, 2.3],
    target: [-0.35, 0.85, -4.5],
  });

  useEffect(() => {
    if (viewMode === 'upgrade' && !hasOpenedUpgrade) {
      setHasOpenedUpgrade(true);
    }
  }, [viewMode, hasOpenedUpgrade]);

  useEffect(() => {
    let cancelled = false;

    async function probeSplatAsset() {
      onSplatStatusChange?.('checking');
      setAholoError(null);
      setSparkError(null);

      if (customSplatUrl && SPLAT_EXT_RE.test(customSplatUrl)) {
        if (!cancelled) {
          setDetectedSplatSrc(customSplatUrl);
          setProbeDone(true);
          onSplatStatusChange?.('loaded');
        }
        return;
      }

      for (const candidate of BASE_STREET_SPLAT_CANDIDATES) {
        try {
          const res = await fetch(candidate, { method: 'HEAD' });
          if (res.ok) {
            if (!cancelled) {
              setDetectedSplatSrc(candidate);
              setProbeDone(true);
              onSplatStatusChange?.('loaded');
            }
            return;
          }
        } catch {
          // Continue checking remaining candidates
        }
      }

      if (!cancelled) {
        setDetectedSplatSrc(null);
        setProbeDone(true);
        onSplatStatusChange?.('fallback');
      }
    }

    probeSplatAsset();
    return () => {
      cancelled = true;
    };
  }, [customSplatUrl, onSplatStatusChange]);

  const hasSplat = probeDone && Boolean(detectedSplatSrc);
  const useSparkForUpgrade = hasSplat && !sparkError;
  const showSpark = viewMode === 'upgrade' && useSparkForUpgrade;
  const showAholo = hasSplat && !aholoError && !showSpark;

  return (
    <div className="relative h-full w-full">
      {!probeDone ? (
        <div className="flex h-full w-full items-center justify-center bg-[#EAE5DC] text-sm font-medium text-[#4A504C]">
          Initializing 3D Scene…
        </div>
      ) : hasSplat && detectedSplatSrc && (!aholoError || !sparkError) ? (
        <>
          {/* Current Reality Engine: @manycore/aholo-viewer */}
          {!aholoError && (
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${
                showAholo
                  ? 'z-10 opacity-100'
                  : 'pointer-events-none z-0 opacity-0'
              }`}
            >
              <AholoSceneViewer
                splatSrc={detectedSplatSrc}
                active={showAholo}
                pins={props.pins}
                viewMode={props.viewMode}
                selectedPinId={props.selectedPinId}
                onSelectPin={props.onSelectPin}
                activeHotspotIds={props.activeHotspotIds}
                cameraGoal={props.cameraGoal}
                sharedCameraRef={sharedCameraRef}
                dropPinMode={props.dropPinMode}
                onDropPinAt={props.onDropPinAt}
                transformOverrides={props.transformOverrides}
                onUpdateTransform={props.onUpdateTransform}
                customGlbUrl={props.customGlbUrl}
                onFallbackError={(reason) => {
                  setAholoError(reason);
                  if (sparkError) onSplatStatusChange?.('fallback');
                }}
              />
            </div>
          )}

          {/* Lux3D Upgrade Engine: Three.js + @sparkjsdev/spark (lazy-mounted on first upgrade view) */}
          {hasOpenedUpgrade && useSparkForUpgrade && (
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${
                showSpark
                  ? 'z-10 opacity-100'
                  : 'pointer-events-none z-0 opacity-0'
              }`}
            >
              <SparkSceneViewer
                splatSrc={detectedSplatSrc}
                active={showSpark}
                pins={props.pins}
                viewMode={props.viewMode}
                selectedPinId={props.selectedPinId}
                selectedInstanceKey={props.selectedInstanceKey}
                onSelectPin={props.onSelectPin}
                activeHotspotIds={props.activeHotspotIds}
                cameraGoal={props.cameraGoal}
                sharedCameraRef={sharedCameraRef}
                dropPinMode={props.dropPinMode}
                onDropPinAt={props.onDropPinAt}
                transformMode={props.transformMode}
                onChangeTransformMode={props.onChangeTransformMode}
                transformOverrides={props.transformOverrides}
                onUpdateTransform={props.onUpdateTransform}
                onToggleLockKey={props.onToggleLockKey}
                onResetTransformKey={props.onResetTransformKey}
                customGlbUrl={props.customGlbUrl}
                onFallbackError={(reason) => {
                  console.warn(
                    'SparkSceneViewer failed, falling back to AholoSceneViewer:',
                    reason
                  );
                  setSparkError(reason);
                }}
              />
            </div>
          )}
        </>
      ) : (
        <SceneViewer
          pins={props.pins}
          viewMode={props.viewMode}
          selectedPinId={props.selectedPinId}
          onSelectPin={props.onSelectPin}
          activeHotspotIds={props.activeHotspotIds}
          cameraGoal={props.cameraGoal}
          dropPinMode={props.dropPinMode}
          onDropPinAt={props.onDropPinAt}
          devTransformEnabled={props.devTransformEnabled}
          transformMode={props.transformMode}
          transformOverrides={props.transformOverrides}
          onUpdateTransform={props.onUpdateTransform}
          customGlbUrl={props.customGlbUrl}
          customSplatUrl={props.customSplatUrl}
        />
      )}
    </div>
  );
}
