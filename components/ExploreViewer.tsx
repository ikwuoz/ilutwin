'use client';

import { useEffect, useState } from 'react';
import { AholoSceneViewer } from '@/components/AholoSceneViewer';
import { SceneViewer } from '@/components/SceneViewer';
import {
  BASE_STREET_SPLAT_CANDIDATES,
  type CommunityProblemPin,
  type TransformOverride,
  type ViewMode,
} from '@/lib/data/upgrades';

interface ExploreViewerProps {
  pins: CommunityProblemPin[];
  viewMode: ViewMode;
  selectedPinId: string | null;
  onSelectPin: (
    pin: CommunityProblemPin | null,
    options?: { skipFly?: boolean }
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
  transformMode: 'translate' | 'scale';
  transformOverrides: Record<string, TransformOverride>;
  onUpdateTransform: (pinId: string, next: TransformOverride) => void;
  customGlbUrl?: string | null;
  customSplatUrl?: string | null;
  onSplatStatusChange?: (status: 'checking' | 'loaded' | 'fallback') => void;
}

const SPLAT_EXT_RE = /\.(splat|spz|ply|sog)(\?|$)/i;

/**
 * Selects @manycore/aholo-viewer whenever a .splat / .spz / .ply / .sog scene
 * is present, and falls back to Three.js (R3F + Drei) only when no splat
 * asset exists or if Aholo Viewer fails to initialize.
 */
export function ExploreViewer(props: ExploreViewerProps) {
  const { customSplatUrl, onSplatStatusChange } = props;

  const [detectedSplatSrc, setDetectedSplatSrc] = useState<string | null>(null);
  const [aholoError, setAholoError] = useState<string | null>(null);
  const [probeDone, setProbeDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function probeSplatAsset() {
      onSplatStatusChange?.('checking');
      setAholoError(null);

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

  const useAholoPrimary =
    probeDone && Boolean(detectedSplatSrc) && !aholoError;

  return (
    <div className="relative h-full w-full">
      {!probeDone ? (
        <div className="flex h-full w-full items-center justify-center bg-[#EAE5DC] text-sm font-medium text-[#4A504C]">
          Initializing 3D Scene…
        </div>
      ) : useAholoPrimary && detectedSplatSrc ? (
        <AholoSceneViewer
          splatSrc={detectedSplatSrc}
          pins={props.pins}
          viewMode={props.viewMode}
          selectedPinId={props.selectedPinId}
          onSelectPin={props.onSelectPin}
          activeHotspotIds={props.activeHotspotIds}
          cameraGoal={props.cameraGoal}
          dropPinMode={props.dropPinMode}
          onDropPinAt={props.onDropPinAt}
          transformOverrides={props.transformOverrides}
          onUpdateTransform={props.onUpdateTransform}
          customGlbUrl={props.customGlbUrl}
          onFallbackError={(reason) => {
            setAholoError(reason);
            onSplatStatusChange?.('fallback');
          }}
        />
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
