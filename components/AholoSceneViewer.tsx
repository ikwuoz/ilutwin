'use client';

import { useEffect, useRef, useState } from 'react';
import { HotspotBadge } from '@/components/HotspotBadge';
import type {
  CommunityProblemPin,
  TransformOverride,
  ViewMode,
} from '@/lib/data/upgrades';

interface AholoSceneViewerProps {
  splatSrc: string;
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
  transformOverrides: Record<string, TransformOverride>;
  onUpdateTransform: (pinId: string, next: TransformOverride) => void;
  customGlbUrl?: string | null;
  onFallbackError: (reason: string) => void;
}

interface ProjectedMarker {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

interface LoadedGlbEntry {
  scene: import('@manycore/aholo-viewer').Object3D;
  minY: number;
  centerX: number;
  centerZ: number;
  height: number;
}

function resolvePropPlacementArgs(
  pin: CommunityProblemPin,
  override?: TransformOverride
): {
  pos: [number, number, number];
  scale: number;
  rotation: [number, number, number];
  stretch: [number, number, number];
} {
  const pos = override?.position ?? pin.position;
  const scale = override?.modelScale ?? pin.modelScale;
  const rotY = override?.rotationY ?? pin.rotationY;
  const baseRot = pin.rotation ?? [0, rotY ?? 0, 0];
  const rotation: [number, number, number] = [
    baseRot[0],
    override?.rotationY !== undefined ? override.rotationY : baseRot[1],
    baseRot[2],
  ];
  const stretch: [number, number, number] = pin.modelStretch ?? [1, 1, 1];
  return { pos, scale, rotation, stretch };
}

const clamp = (val: number, min: number, max: number) =>
  Math.min(max, Math.max(min, val));
const roundCoord = (n: number) => Math.round(n * 100) / 100;

function applyPropPlacement(
  entry: LoadedGlbEntry,
  pos: [number, number, number],
  scale: number,
  rotation: [number, number, number] = [0, 0, 0],
  stretch: [number, number, number] = [1, 1, 1]
): void {
  const sx = scale * stretch[0];
  const sy = scale * stretch[1];
  const sz = scale * stretch[2];
  entry.scene.rotation.set(rotation[0], rotation[1], rotation[2]);
  entry.scene.scale.set(sx, sy, sz);
  const cos = Math.cos(rotation[1]);
  const sin = Math.sin(rotation[1]);
  const offsetX = entry.centerX * sx * cos + entry.centerZ * sz * sin;
  const offsetZ = -entry.centerX * sx * sin + entry.centerZ * sz * cos;
  entry.scene.position.set(
    pos[0] - offsetX,
    pos[1] - entry.minY * sy,
    pos[2] - offsetZ
  );
  entry.scene.updateMatrixWorld?.(true);
}

/**
 * `@manycore/aholo-viewer`'s `GLTFLoader.loadGLTF` parses JSON strings or binary
 * `ArrayBuffer`s (not URL strings), so we fetch the `.glb` bytes first and
 * compute its local `Box3` bounds to rest its base flush on `y = pos[1]`.
 */
async function loadAndNormalizeGlb(
  url: string,
  aholo: typeof import('@manycore/aholo-viewer'),
  viewer: import('@manycore/aholo-viewer').Viewer,
  signal?: AbortSignal
): Promise<LoadedGlbEntry | null> {
  const res = await fetch(url, { signal });
  if (!res.ok) return null;

  const buffer = await res.arrayBuffer();
  const parsed = await aholo.GLTFLoader.loadGLTF(buffer, {
    textureLoader: (texUrl) =>
      aholo.downloadTexture(texUrl, { context: viewer }),
  });

  const bbox = new aholo.Box3().setFromObject(parsed.scene);
  const finiteBounds =
    Number.isFinite(bbox.min.y) && Number.isFinite(bbox.max.y);

  return {
    scene: parsed.scene,
    minY: finiteBounds ? bbox.min.y : 0,
    centerX: finiteBounds ? (bbox.min.x + bbox.max.x) / 2 : 0,
    centerZ: finiteBounds ? (bbox.min.z + bbox.max.z) / 2 : 0,
    height: finiteBounds ? Math.max(0.2, bbox.max.y - bbox.min.y) : 1.5,
  };
}

const RELATIVE_WORKER_IMPORT_RE = /^import\s+"(\/[^"]+\.js)";\s*$/;
const AHOLO_BLOB_PATCHED = Symbol.for('ilutwin.aholoWorkerBlobPatched');

/**
 * Turbopack rewrites `new URL("./*-worker.js", import.meta.url).href` to a
 * root-relative `/_next/...` path, which fails when `@manycore/aholo-viewer`
 * evaluates `import "/_next/...";` inside a `blob:` module Worker.
 */
function ensureAholoWorkerBlobCompat(): void {
  if (typeof window === 'undefined') return;
  const win = window as unknown as Record<symbol, boolean>;
  if (win[AHOLO_BLOB_PATCHED]) return;

  const OriginalBlob = window.Blob;
  class AholoWorkerCompatBlob extends OriginalBlob {
    constructor(parts: BlobPart[] = [], options?: BlobPropertyBag) {
      if (
        options?.type === 'text/javascript' &&
        parts.length === 1 &&
        typeof parts[0] === 'string'
      ) {
        const match = RELATIVE_WORKER_IMPORT_RE.exec(parts[0]);
        if (match) {
          const absUrl = new URL(match[1], window.location.origin).href;
          parts = [`import ${JSON.stringify(absUrl)};`];
        }
      }
      super(parts, options);
    }
  }

  window.Blob = AholoWorkerCompatBlob;
  win[AHOLO_BLOB_PATCHED] = true;
}

function resolveSplatSourceAndType(
  rawUrl: string,
  SplatFileType: typeof import('@manycore/aholo-viewer').SplatLoader.SplatFileType,
  SplatPackType: typeof import('@manycore/aholo-viewer').SplatLoader.SplatPackType
) {
  const lower = rawUrl.toLowerCase();
  const proxiedOrLocal = rawUrl.startsWith('https://')
    ? `/api/world/asset?url=${encodeURIComponent(rawUrl)}`
    : rawUrl;
  // Resolve to an origin-qualified URL so `fetch()` inside Aholo's blob Worker succeeds.
  const fetchUrl =
    typeof window !== 'undefined'
      ? new URL(proxiedOrLocal, window.location.origin).href
      : proxiedOrLocal;

  if (/\.spz(\?|$)/i.test(lower)) {
    return {
      fetchUrl,
      fileType: SplatFileType.SPZ,
      packType: SplatPackType.Compressed,
    };
  }
  if (/\.ply(\?|$)/i.test(lower)) {
    return {
      fetchUrl,
      fileType: SplatFileType.PLY,
      packType: SplatPackType.Raw,
    };
  }
  if (/\.sog(\?|$)/i.test(lower)) {
    return {
      fetchUrl,
      fileType: SplatFileType.SOG,
      packType: SplatPackType.Sog,
    };
  }
  return {
    fetchUrl,
    fileType: SplatFileType.SPLAT,
    packType: SplatPackType.Raw,
  };
}

export function AholoSceneViewer({
  splatSrc,
  pins,
  viewMode,
  selectedPinId,
  onSelectPin,
  activeHotspotIds,
  cameraGoal,
  dropPinMode,
  onDropPinAt,
  transformOverrides,
  onUpdateTransform,
  customGlbUrl,
  onFallbackError,
}: AholoSceneViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [loadingSplat, setLoadingSplat] = useState(true);
  const [markers, setMarkers] = useState<ProjectedMarker[]>([]);
  const [propCursor, setPropCursor] = useState<'none' | 'grab' | 'grabbing'>(
    'none'
  );

  // Refs for syncing React props cleanly into the rAF loop without re-creating Viewer
  const pinsRef = useRef(pins);
  const viewModeRef = useRef(viewMode);
  const activeIdsRef = useRef(activeHotspotIds);
  const overridesRef = useRef(transformOverrides);
  const dropModeRef = useRef(dropPinMode);
  const onSelectRef = useRef(onSelectPin);
  const onDropRef = useRef(onDropPinAt);
  const onUpdateTransformRef = useRef(onUpdateTransform);
  const onFallbackRef = useRef(onFallbackError);
  const activeDragRef = useRef<{
    pinId: string;
    pos: [number, number, number];
  } | null>(null);

  pinsRef.current = pins;
  viewModeRef.current = viewMode;
  activeIdsRef.current = activeHotspotIds;
  overridesRef.current = transformOverrides;
  dropModeRef.current = dropPinMode;
  onSelectRef.current = onSelectPin;
  onDropRef.current = onDropPinAt;
  onUpdateTransformRef.current = onUpdateTransform;
  onFallbackRef.current = onFallbackError;

  const cameraGoalRef = useRef<{
    pos: [number, number, number];
    target: [number, number, number];
    active: boolean;
  }>({
    pos: [0.85, 1.85, 2.3],
    target: [-0.35, 0.85, -4.5],
    active: false,
  });

  useEffect(() => {
    if (cameraGoal && cameraGoal.seq > 0) {
      cameraGoalRef.current = {
        pos: cameraGoal.position,
        target: cameraGoal.target,
        active: true,
      };
    }
  }, [cameraGoal]);

  // Map of loaded GLTF props & local bounds keyed by pin ID (or '__custom__')
  const loadedPropsRef = useRef<Map<string, LoadedGlbEntry>>(new Map());
  const solarLightRef = useRef<import('@manycore/aholo-viewer').PointLight | null>(
    null
  );
  const viewerRef = useRef<import('@manycore/aholo-viewer').Viewer | null>(
    null
  );

  // Sync visibility, grounded position, scale, and solar upgrade lighting
  useEffect(() => {
    let solarPos: [number, number, number] | null = null;
    let solarOn = false;

    for (const pin of pins) {
      const { pos, scale, rotation, stretch } = resolvePropPlacementArgs(
        pin,
        transformOverrides[pin.id]
      );
      const isVisible =
        viewMode === 'upgrade' && activeHotspotIds.includes(pin.id);

      if (pin.fallbackKind === 'solar') {
        solarPos = pos;
        solarOn = isVisible;
      }

      const entry = loadedPropsRef.current.get(pin.id);
      if (!entry) continue;
      applyPropPlacement(entry, pos, scale, rotation, stretch);
      entry.scene.visible = isVisible;
    }

    if (solarLightRef.current) {
      if (solarPos) {
        solarLightRef.current.position.set(
          solarPos[0],
          solarPos[1] + 3.6,
          solarPos[2]
        );
      }
      solarLightRef.current.intensity = solarOn ? 4.2 : 0;
    }

    const customEntry = loadedPropsRef.current.get('__custom__');
    if (customEntry) {
      customEntry.scene.visible = viewMode === 'upgrade';
    }
  }, [pins, viewMode, activeHotspotIds, transformOverrides]);

  // Initialize Aholo Viewer & load base 3DGS splat
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let rafId = 0;
    let cleanupEvents: (() => void) | null = null;
    const loadAbort = new AbortController();
    const loadedMap = loadedPropsRef.current;

    async function boot() {
      if (!host) return;

      try {
        ensureAholoWorkerBlobCompat();
        const aholo = await import('@manycore/aholo-viewer');
        if (disposed) return;

        const {
          createViewer,
          setViewerConfig,
          BackgroundMode,
          Color,
          ToneMapping,
          PerspectiveCamera,
          AmbientLight,
          DirectionalLight,
          PointLight,
          Vector3,
          Vector2,
          Plane,
          Raycaster,
          SplatLoader,
          SplatUtils,
        } = aholo;

        const width = host.clientWidth || 800;
        const height = host.clientHeight || 600;

        const viewer = createViewer('ilutwin-aholo-viewer', host, {
          antialiasing: true,
          alpha: false,
        });
        viewerRef.current = viewer;

        setViewerConfig(viewer, {
          pipeline: {
            Background: {
              enabled: true,
              up: new Vector3(0, 1, 0),
              ground: { enabled: false },
              background: {
                active: BackgroundMode.BasicBackground,
                basic: {
                  color: new Color('#D9D3C7'),
                  alpha: 1,
                },
              },
            },
            Splatting: {
              enabled: true,
              composite: {
                enabled: true,
                highPrecisionEnabled: true,
                toneMapping: ToneMapping.Neutral,
                exposure: 1,
              },
            },
          },
        });

        const scene = viewer.getScene();
        const ambient = new AmbientLight('#FFF8EB', 1.05);
        scene.add(ambient);

        const sun = new DirectionalLight('#FFF3DB', 1.65);
        sun.position.set(10, 14, 8);
        scene.add(sun);

        const solarLight = new PointLight('#FFD580', 0, 16, 1.5);
        scene.add(solarLight);
        solarLightRef.current = solarLight;

        const camera = new PerspectiveCamera(50, width / height, 0.1, 1000);
        const targetVec = new Vector3(-0.35, 0.85, -4.5);
        const camPosVec = new Vector3(0.85, 1.85, 2.3);
        camera.position.copy(camPosVec);
        camera.lookAt(targetVec);
        viewer.setCamera(camera);

        // Orbit/pan/zoom state
        const offset = new Vector3().subVectors(camPosVec, targetVec);
        let radius = offset.length();
        let theta = Math.atan2(offset.x, offset.z);
        let phi = Math.acos(Math.min(1, Math.max(-1, offset.y / radius)));

        let draggingMode: 'none' | 'orbit' | 'pan' | 'prop' = 'none';
        let downX = 0;
        let downY = 0;
        let prevX = 0;
        let prevY = 0;
        let lastHoverCheckAt = 0;
        let lastPropCursor: 'none' | 'grab' | 'grabbing' = 'none';

        const updatePropCursor = (next: 'none' | 'grab' | 'grabbing') => {
          if (next === lastPropCursor) return;
          lastPropCursor = next;
          setPropCursor(next);
        };

        const raycaster = new Raycaster();
        const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
        const dragPlane = new Plane(new Vector3(0, 1, 0), 0);
        const hitPoint = new Vector3();

        interface ActivePropDrag {
          pin: CommunityProblemPin;
          entry: LoadedGlbEntry;
          dragOffset: InstanceType<typeof Vector3>;
          startPos: [number, number, number];
          currentPos: [number, number, number];
          scale: number;
          rotation: [number, number, number];
          stretch: [number, number, number];
          verticalMode: boolean;
          startClientY: number;
        }
        let propDrag: ActivePropDrag | null = null;

        const setRayFromClient = (clientX: number, clientY: number) => {
          const rect = host.getBoundingClientRect();
          if (!rect.width || !rect.height) return false;
          const ndc = new Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
          );
          raycaster.setFromCamera(ndc, camera);
          return true;
        };

        const findUnlockedPropAtPointer = (
          clientX: number,
          clientY: number
        ) => {
          if (dropModeRef.current || viewModeRef.current !== 'upgrade') {
            return null;
          }
          if (!setRayFromClient(clientX, clientY)) return null;

          const rootMap = new Map<
            import('@manycore/aholo-viewer').Object3D,
            { pin: CommunityProblemPin; entry: LoadedGlbEntry }
          >();
          for (const pin of pinsRef.current) {
            if (!activeIdsRef.current.includes(pin.id)) continue;
            if (overridesRef.current[pin.id]?.locked) continue;
            const entry = loadedMap.get(pin.id);
            if (!entry || !entry.scene.visible) continue;
            entry.scene.updateMatrixWorld?.(true);
            rootMap.set(entry.scene, { pin, entry });
          }
          if (rootMap.size === 0) return null;

          const hits = raycaster.intersectObjects(
            Array.from(rootMap.keys()),
            true
          );
          for (const hit of hits) {
            let obj: import('@manycore/aholo-viewer').Object3D | null =
              hit.object;
            while (obj) {
              const matched = rootMap.get(obj);
              if (matched) return matched;
              obj = obj.parent ?? null;
            }
          }
          return null;
        };

        const onPointerDown = (e: PointerEvent) => {
          downX = e.clientX;
          downY = e.clientY;
          prevX = e.clientX;
          prevY = e.clientY;
          cameraGoalRef.current.active = false;

          if (e.button === 0) {
            const hitProp = findUnlockedPropAtPointer(e.clientX, e.clientY);
            if (hitProp) {
              const { pin, entry } = hitProp;
              const { pos, scale, rotation, stretch } =
                resolvePropPlacementArgs(pin, overridesRef.current[pin.id]);
              dragPlane.set(new Vector3(0, 1, 0), -pos[1]);
              const dragOffset = new Vector3(0, 0, 0);
              if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
                dragOffset.set(pos[0] - hitPoint.x, 0, pos[2] - hitPoint.z);
              }
              propDrag = {
                pin,
                entry,
                dragOffset,
                startPos: [...pos],
                currentPos: [...pos],
                scale,
                rotation,
                stretch,
                verticalMode: e.shiftKey,
                startClientY: e.clientY,
              };
              activeDragRef.current = { pinId: pin.id, pos: [...pos] };
              draggingMode = 'prop';
              updatePropCursor('grabbing');
              onSelectRef.current(pin, { skipFly: true });
              return;
            }
          }

          draggingMode = e.button === 2 || e.shiftKey ? 'pan' : 'orbit';
        };

        const onPointerMove = (e: PointerEvent) => {
          if (draggingMode === 'none') {
            const now = performance.now();
            if (now - lastHoverCheckAt >= 100) {
              lastHoverCheckAt = now;
              const overHost =
                e.target instanceof Node && host.contains(e.target);
              const hit = overHost
                ? findUnlockedPropAtPointer(e.clientX, e.clientY)
                : null;
              updatePropCursor(hit ? 'grab' : 'none');
            }
            return;
          }

          const dx = e.clientX - prevX;
          const dy = e.clientY - prevY;
          prevX = e.clientX;
          prevY = e.clientY;

          if (draggingMode === 'prop' && propDrag) {
            let nextPos: [number, number, number] = [...propDrag.currentPos];
            if (propDrag.verticalMode || e.shiftKey) {
              const dyWorld = (propDrag.startClientY - e.clientY) * 0.01;
              nextPos = [
                nextPos[0],
                roundCoord(clamp(propDrag.startPos[1] + dyWorld, -1.2, 2.5)),
                nextPos[2],
              ];
            } else if (
              setRayFromClient(e.clientX, e.clientY) &&
              raycaster.ray.intersectPlane(dragPlane, hitPoint)
            ) {
              nextPos = [
                roundCoord(clamp(hitPoint.x + propDrag.dragOffset.x, -4.5, 4.5)),
                propDrag.currentPos[1],
                roundCoord(clamp(hitPoint.z + propDrag.dragOffset.z, -6.5, 2.5)),
              ];
            }

            propDrag.currentPos = nextPos;
            activeDragRef.current = {
              pinId: propDrag.pin.id,
              pos: nextPos,
            };
            applyPropPlacement(
              propDrag.entry,
              nextPos,
              propDrag.scale,
              propDrag.rotation,
              propDrag.stretch
            );
            if (propDrag.pin.fallbackKind === 'solar' && solarLightRef.current) {
              solarLightRef.current.position.set(
                nextPos[0],
                nextPos[1] + 3.6,
                nextPos[2]
              );
            }
            return;
          }

          if (draggingMode === 'orbit') {
            theta -= dx * 0.006;
            phi = Math.min(Math.PI / 2 - 0.06, Math.max(0.45, phi - dy * 0.006));
          } else {
            const panSpeed = radius * 0.0015;
            const forward = new Vector3()
              .subVectors(targetVec, camera.position)
              .setY(0)
              .normalize();
            const right = new Vector3()
              .crossVectors(forward, new Vector3(0, 1, 0))
              .normalize();
            targetVec.addScaledVector(right, -dx * panSpeed);
            targetVec.addScaledVector(forward, dy * panSpeed);
          }
        };

        const onPointerUp = (e: PointerEvent) => {
          if (draggingMode === 'prop' && propDrag) {
            const finished = propDrag;
            propDrag = null;
            activeDragRef.current = null;
            draggingMode = 'none';
            updatePropCursor('grab');
            const changed = finished.currentPos.some(
              (v, idx) => v !== finished.startPos[idx]
            );
            if (changed) {
              onUpdateTransformRef.current(finished.pin.id, {
                position: finished.currentPos,
                modelScale: finished.scale,
                rotationY: finished.rotation[1],
                locked: false,
              });
            }
            return;
          }

          const movedDist = Math.hypot(e.clientX - downX, e.clientY - downY);
          if (
            draggingMode === 'orbit' &&
            movedDist <= 5 &&
            dropModeRef.current &&
            setRayFromClient(e.clientX, e.clientY)
          ) {
            const rawHit = raycaster.ray.intersectPlane(groundPlane, hitPoint)
              ? hitPoint
              : hitPoint
                  .copy(raycaster.ray.origin)
                  .addScaledVector(raycaster.ray.direction, 4.5);
            onDropRef.current([
              roundCoord(clamp(rawHit.x, -2.2, 2.6)),
              0,
              roundCoord(clamp(rawHit.z, -4.3, -0.4)),
            ]);
          }
          draggingMode = 'none';
        };

        const onWheel = (e: WheelEvent) => {
          e.preventDefault();
          cameraGoalRef.current.active = false;
          radius = Math.min(9.5, Math.max(1.5, radius * (1 + e.deltaY * 0.001)));
        };

        const onContextMenu = (e: MouseEvent) => e.preventDefault();

        host.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        host.addEventListener('wheel', onWheel, { passive: false });
        host.addEventListener('contextmenu', onContextMenu);

        const resizeObserver = new ResizeObserver(() => {
          if (disposed || !host) return;
          const w = host.clientWidth || 800;
          const h = host.clientHeight || 600;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          viewer.resize({ width: w, height: h });
        });
        resizeObserver.observe(host);

        cleanupEvents = () => {
          resizeObserver.disconnect();
          host.removeEventListener('pointerdown', onPointerDown);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          host.removeEventListener('wheel', onWheel);
          host.removeEventListener('contextmenu', onContextMenu);
        };

        // Load base 3DGS splat (.splat / .spz / .ply / .sog)
        setLoadingSplat(true);
        const { fetchUrl, fileType, packType } = resolveSplatSourceAndType(
          splatSrc,
          SplatLoader.SplatFileType,
          SplatLoader.SplatPackType
        );
        const splatData = await SplatLoader.parseSplatData(
          fileType,
          fetchUrl,
          packType,
          { signal: loadAbort.signal }
        );
        if (disposed) return;

        const splatObj = await SplatUtils.createSplat(splatData);
        if (disposed) return;

        // Aholo World / Spatial Gen `.spz` and `.ply` files are +Z-up with ground ~ z = -1.6.
        // Rotate -90 deg around X and lift so the street corridor rests upright at y = 0.
        if (
          fileType === SplatLoader.SplatFileType.SPZ ||
          fileType === SplatLoader.SplatFileType.PLY
        ) {
          splatObj.rotation.x = -Math.PI / 2;
          splatObj.position.set(0, 1.6, 0);
        }

        scene.add(splatObj);
        setLoadingSplat(false);

        const attachPinEntry = (
          key: string,
          entry: LoadedGlbEntry,
          pos: [number, number, number],
          scale: number,
          visible: boolean,
          rotation: [number, number, number] = [0, 0, 0],
          stretch: [number, number, number] = [1, 1, 1]
        ) => {
          applyPropPlacement(entry, pos, scale, rotation, stretch);
          entry.scene.visible = visible;
          scene.add(entry.scene);
          loadedMap.set(key, entry);
        };

        // Load optional custom Lux3D GLB (?glb=...)
        if (customGlbUrl) {
          try {
            const customEntry = await loadAndNormalizeGlb(
              customGlbUrl,
              aholo,
              viewer,
              loadAbort.signal
            );
            if (!disposed && customEntry) {
              attachPinEntry(
                '__custom__',
                customEntry,
                [0, 0, 2.2],
                0.85,
                viewModeRef.current === 'upgrade'
              );
            }
          } catch (glbErr) {
            if (!loadAbort.signal.aborted) {
              console.warn('Optional custom GLB failed to load:', glbErr);
            }
          }
        }

        // Load available GLB props for current pins
        const loadPinGlb = async (pin: CommunityProblemPin) => {
          if (loadedMap.has(pin.id)) return;
          try {
            const entry = await loadAndNormalizeGlb(
              pin.modelPath,
              aholo,
              viewer,
              loadAbort.signal
            );
            if (disposed || !entry) return;
            const { pos, scale, rotation, stretch } = resolvePropPlacementArgs(
              pin,
              overridesRef.current[pin.id]
            );
            const visible =
              viewModeRef.current === 'upgrade' &&
              activeIdsRef.current.includes(pin.id);
            attachPinEntry(pin.id, entry, pos, scale, visible, rotation, stretch);
            if (pin.fallbackKind === 'solar') {
              solarLight.position.set(pos[0], pos[1] + 3.6, pos[2]);
              solarLight.intensity = visible ? 4.2 : 0;
            }
          } catch (glbErr) {
            if (!loadAbort.signal.aborted) {
              console.warn(`GLB prop load skipped (${pin.modelPath}):`, glbErr);
            }
          }
        };

        void Promise.all(pinsRef.current.map(loadPinGlb));

        let lastTime = performance.now();
        let lastProjectedKey = '';
        const projVec = new Vector3();

        const tick = (now: number) => {
          if (disposed) return;
          rafId = requestAnimationFrame(tick);

          const dt = Math.min(0.05, (now - lastTime) / 1000);
          lastTime = now;

          // Smooth camera preset / pin focus transitions
          if (cameraGoalRef.current.active) {
            const goalPos = new Vector3(...cameraGoalRef.current.pos);
            const goalTarget = new Vector3(...cameraGoalRef.current.target);
            const alpha = Math.min(1, dt * 4.5);

            targetVec.lerp(goalTarget, alpha);
            camera.position.lerp(goalPos, alpha);

            const nextOffset = new Vector3().subVectors(
              camera.position,
              targetVec
            );
            radius = Math.max(2.5, nextOffset.length());
            theta = Math.atan2(nextOffset.x, nextOffset.z);
            phi = Math.acos(
              Math.min(1, Math.max(-1, nextOffset.y / radius))
            );

            if (
              camera.position.distanceTo(goalPos) < 0.08 &&
              targetVec.distanceTo(goalTarget) < 0.08
            ) {
              cameraGoalRef.current.active = false;
            }
          } else {
            const sinPhi = Math.sin(phi);
            camera.position.set(
              targetVec.x + radius * sinPhi * Math.sin(theta),
              targetVec.y + radius * Math.cos(phi),
              targetVec.z + radius * sinPhi * Math.cos(theta)
            );
          }

          camera.lookAt(targetVec);
          viewer.render();

          // Project 3D pins into 2D screen space for HTML markers
          const w = host.clientWidth || 800;
          const h = host.clientHeight || 600;
          const nextMarkers: ProjectedMarker[] = pinsRef.current.map((pin) => {
            const { pos, scale, stretch } = resolvePropPlacementArgs(
              pin,
              overridesRef.current[pin.id]
            );
            const effectivePos =
              activeDragRef.current?.pinId === pin.id
                ? activeDragRef.current.pos
                : pos;
            const entry = loadedPropsRef.current.get(pin.id);
            const propTopOffset = entry
              ? Math.min(3.4, entry.height * scale * stretch[1] + 0.35)
              : pin.fallbackKind === 'solar'
                ? 2.45
                : 1.15;
            const markerY = effectivePos[1] + propTopOffset;
            projVec
              .set(effectivePos[0], markerY, effectivePos[2])
              .project(camera);

            const visible =
              projVec.z >= -1 &&
              projVec.z <= 1 &&
              projVec.x >= -1.1 &&
              projVec.x <= 1.1 &&
              projVec.y >= -1.1 &&
              projVec.y <= 1.1;

            return {
              id: pin.id,
              x: Math.round(((projVec.x + 1) / 2) * w),
              y: Math.round(((-projVec.y + 1) / 2) * h),
              visible,
            };
          });

          const key = nextMarkers
            .map((m) => `${m.id}:${m.x},${m.y},${m.visible ? 1 : 0}`)
            .join('|');
          if (key !== lastProjectedKey) {
            lastProjectedKey = key;
            setMarkers(nextMarkers);
          }
        };

        rafId = requestAnimationFrame(tick);
      } catch (err) {
        if (!disposed) {
          const message =
            err instanceof Error
              ? err.message
              : 'Aholo Viewer failed to initialize';
          onFallbackRef.current(message);
        }
      }
    }

    boot();

    return () => {
      disposed = true;
      loadAbort.abort();
      cancelAnimationFrame(rafId);
      cleanupEvents?.();
      loadedMap.clear();
      solarLightRef.current = null;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
          // Ignore teardown errors
        }
        viewerRef.current = null;
      }
    };
  }, [splatSrc, customGlbUrl]);

  // Load GLTF props for dynamically dropped pins added after mount
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const abortController = new AbortController();
    async function loadMissingPins() {
      const aholo = await import('@manycore/aholo-viewer');
      const scene = viewer?.getScene();
      if (!viewer || !scene || abortController.signal.aborted) return;

      for (const pin of pins) {
        if (loadedPropsRef.current.has(pin.id)) continue;
        try {
          const entry = await loadAndNormalizeGlb(
            pin.modelPath,
            aholo,
            viewer,
            abortController.signal
          );
          if (abortController.signal.aborted || !entry) continue;
          const { pos, scale, rotation, stretch } = resolvePropPlacementArgs(
            pin,
            overridesRef.current[pin.id]
          );
          applyPropPlacement(entry, pos, scale, rotation, stretch);
          entry.scene.visible =
            viewModeRef.current === 'upgrade' &&
            activeIdsRef.current.includes(pin.id);
          scene.add(entry.scene);
          loadedPropsRef.current.set(pin.id, entry);
        } catch (glbErr) {
          if (!abortController.signal.aborted) {
            console.warn(`Dynamic GLB prop skipped (${pin.modelPath}):`, glbErr);
          }
        }
      }
    }

    loadMissingPins();
    return () => {
      abortController.abort();
    };
  }, [pins]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#D9D3C7] ${
        dropPinMode
          ? 'cursor-crosshair'
          : propCursor === 'grabbing'
            ? 'cursor-grabbing'
            : propCursor === 'grab'
              ? 'cursor-grab'
              : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      <div ref={hostRef} className="h-full w-full" />

      {loadingSplat && (
        <div className="hud-glass-dark tabular-mono pointer-events-none absolute top-4 right-4 z-10 rounded-full px-3 py-1 text-[11px] font-semibold text-white">
          Loading 3DGS Street…
        </div>
      )}

      {/* Projected 3D HTML hotspot overlays */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {markers.map((m) => {
          if (!m.visible) return null;
          const pin = pins.find((p) => p.id === m.id);
          if (!pin) return null;
          const isSelected = pin.id === selectedPinId;
          const isUpgradeActive =
            viewMode === 'upgrade' && activeHotspotIds.includes(pin.id);

          return (
            <div
              key={pin.id}
              style={{
                transform: `translate(-50%, -50%) translate(${m.x}px, ${m.y}px)`,
                zIndex: isSelected ? 30 : 10,
              }}
              className="pointer-events-auto absolute top-0 left-0 hover:z-30"
            >
              <HotspotBadge
                pin={pin}
                isSelected={isSelected}
                isUpgradeActive={isUpgradeActive}
                onSelect={(picked) =>
                  onSelectPin(picked.id === selectedPinId ? null : picked)
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
