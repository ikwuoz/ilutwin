'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { Lock, Move, RotateCcw, RotateCw, Scaling, Unlock } from 'lucide-react';
import { HotspotBadge } from '@/components/HotspotBadge';
import {
  getInstanceOverrideKey,
  getPinInstances,
  parseInstanceOverrideKey,
  type CommunityProblemPin,
  type PropInstance,
  type TransformMode,
  type TransformOverride,
  type ViewMode,
} from '@/lib/data/upgrades';

export interface SharedCameraState {
  position: [number, number, number];
  target: [number, number, number];
}

interface SparkSceneViewerProps {
  splatSrc: string;
  active: boolean;
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
  sharedCameraRef?: React.MutableRefObject<SharedCameraState>;
  dropPinMode: boolean;
  onDropPinAt: (coords: [number, number, number]) => void;
  transformMode: TransformMode;
  onChangeTransformMode: (mode: TransformMode) => void;
  transformOverrides: Record<string, TransformOverride>;
  onUpdateTransform: (instanceKey: string, next: TransformOverride) => void;
  onToggleLockKey: (instanceKey: string) => void;
  onResetTransformKey: (instanceKey: string) => void;
  customGlbUrl?: string | null;
  onFallbackError?: (reason: string) => void;
}

interface ProjectedMarker {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

interface GlbTemplate {
  scene: THREE.Group;
  minY: number;
  centerX: number;
  centerZ: number;
  widthX: number;
  depthZ: number;
  height: number;
}

interface PlacedInstance {
  key: string;
  pinId: string;
  instanceId: string;
  label: string;
  pivot: THREE.Group;
  content: THREE.Group;
  shadowMesh: THREE.Mesh;
  baseScale: number;
  baseStretch: [number, number, number];
  height: number;
}

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.06,
      size / 2,
      size / 2,
      size * 0.48
    );
    grad.addColorStop(0, 'rgba(8, 10, 12, 0.56)');
    grad.addColorStop(0.55, 'rgba(8, 10, 12, 0.24)');
    grad.addColorStop(1, 'rgba(8, 10, 12, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function tuneGlbMaterials(root: THREE.Object3D, modelPath: string) {
  const lower = modelPath.toLowerCase();
  const isDrain = lower.includes('drain');
  const isLamp = lower.includes('solar') || lower.includes('lamp');
  const isWaste = lower.includes('waste');

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const mats = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const rawMat of mats) {
      const mat = rawMat as THREE.MeshStandardMaterial;
      if (!mat || !('roughness' in mat)) continue;
      if (isDrain) {
        // Prevent concrete slab from clipping white under overcast lighting
        mat.color?.multiplyScalar(0.82);
        mat.roughness = Math.max(mat.roughness, 0.9);
        mat.metalness = Math.min(mat.metalness, 0.08);
      } else if (isLamp) {
        mat.color?.multiplyScalar(0.94);
        mat.roughness = Math.min(mat.roughness, 0.58);
        mat.metalness = Math.max(mat.metalness, 0.22);
      } else if (isWaste) {
        mat.color?.multiplyScalar(0.9);
        mat.roughness = Math.max(0.55, Math.min(mat.roughness, 0.78));
      } else {
        mat.color?.multiplyScalar(0.92);
      }
      mat.needsUpdate = true;
    }
  });
}

function resolveInstanceTransform(
  pin: CommunityProblemPin,
  inst: PropInstance,
  override?: TransformOverride
): {
  pos: [number, number, number];
  scale: number;
  rotation: [number, number, number];
  stretch: [number, number, number];
  locked: boolean;
} {
  const basePos = inst.position ?? pin.position;
  const baseScale = inst.modelScale ?? pin.modelScale;
  const baseStretch: [number, number, number] = inst.modelStretch ??
    pin.modelStretch ?? [1, 1, 1];
  const baseRot: [number, number, number] = inst.rotation ??
    pin.rotation ?? [0, inst.rotationY ?? pin.rotationY ?? 0, 0];

  const pos = override?.position ?? basePos;
  const scale = override?.modelScale ?? baseScale;
  const rotation: [number, number, number] = override?.rotation
    ? override.rotation
    : [baseRot[0], override?.rotationY ?? baseRot[1], baseRot[2]];
  const locked = Boolean(override?.locked);

  return { pos, scale, rotation, stretch: baseStretch, locked };
}

function resolveSplatUrl(rawUrl: string): string {
  const proxiedOrLocal = rawUrl.startsWith('https://')
    ? `/api/world/asset?url=${encodeURIComponent(rawUrl)}`
    : rawUrl;
  return typeof window !== 'undefined'
    ? new URL(proxiedOrLocal, window.location.origin).href
    : proxiedOrLocal;
}

export function SparkSceneViewer({
  splatSrc,
  active,
  pins,
  viewMode,
  selectedPinId,
  selectedInstanceKey,
  onSelectPin,
  activeHotspotIds,
  cameraGoal,
  sharedCameraRef,
  dropPinMode,
  onDropPinAt,
  transformMode,
  onChangeTransformMode,
  transformOverrides,
  onUpdateTransform,
  onToggleLockKey,
  onResetTransformKey,
  customGlbUrl,
  onFallbackError,
}: SparkSceneViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [markers, setMarkers] = useState<ProjectedMarker[]>([]);
  const [loadingSplat, setLoadingSplat] = useState(true);
  const [propCursor, setPropCursor] = useState<'none' | 'grab' | 'grabbing'>(
    'none'
  );
  const [liveHudReadout, setLiveHudReadout] = useState<string | null>(null);

  const activeRef = useRef(active);
  activeRef.current = active;
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const activeIdsRef = useRef(activeHotspotIds);
  activeIdsRef.current = activeHotspotIds;
  const selectedKeyRef = useRef(selectedInstanceKey);
  selectedKeyRef.current = selectedInstanceKey;
  const transformModeRef = useRef(transformMode);
  transformModeRef.current = transformMode;
  const overridesRef = useRef(transformOverrides);
  overridesRef.current = transformOverrides;
  const dropModeRef = useRef(dropPinMode);
  dropModeRef.current = dropPinMode;
  const onDropRef = useRef(onDropPinAt);
  onDropRef.current = onDropPinAt;
  const onSelectPinRef = useRef(onSelectPin);
  onSelectPinRef.current = onSelectPin;
  const onUpdateTransformRef = useRef(onUpdateTransform);
  onUpdateTransformRef.current = onUpdateTransform;
  const onFallbackRef = useRef(onFallbackError);
  onFallbackRef.current = onFallbackError;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformCtrlRef = useRef<TransformControls | null>(null);
  const instancesMapRef = useRef<Map<string, PlacedInstance>>(new Map());
  const glbCacheRef = useRef<Map<string, Promise<GlbTemplate | null>>>(
    new Map()
  );
  const contactTexRef = useRef<THREE.CanvasTexture | null>(null);
  const isGizmoDraggingRef = useRef(false);
  const isDirectDraggingRef = useRef(false);
  const cameraTweenRef = useRef<{
    active: boolean;
    position: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    position: new THREE.Vector3(0.85, 1.85, 2.3),
    target: new THREE.Vector3(-0.35, 0.85, -4.5),
  });

  // Sync camera from shared ref whenever this engine becomes active
  useEffect(() => {
    if (!active || !sharedCameraRef?.current) return;
    const cam = cameraRef.current;
    const orbit = orbitRef.current;
    if (!cam || !orbit) return;
    const { position, target } = sharedCameraRef.current;
    cameraTweenRef.current.active = false;
    cam.position.set(position[0], position[1], position[2]);
    orbit.target.set(target[0], target[1], target[2]);
    orbit.update();
  }, [active, sharedCameraRef]);

  // Trigger smooth camera tween when preset changes
  useEffect(() => {
    if (!cameraGoal) return;
    cameraTweenRef.current = {
      active: true,
      position: new THREE.Vector3(...cameraGoal.position),
      target: new THREE.Vector3(...cameraGoal.target),
    };
  }, [cameraGoal]);

  // Sync TransformControls mode & attachment to selected unlocked instance
  useEffect(() => {
    const tc = transformCtrlRef.current;
    if (!tc) return;
    tc.setMode(transformMode);

    if (!active || viewMode !== 'upgrade' || dropPinMode) {
      tc.detach();
      return;
    }

    const key = selectedInstanceKey;
    if (!key) {
      tc.detach();
      return;
    }
    const inst = instancesMapRef.current.get(key);
    const isLocked = Boolean(transformOverrides[key]?.locked);
    if (inst && inst.pivot.visible && !isLocked) {
      tc.attach(inst.pivot);
    } else {
      tc.detach();
    }
  }, [
    active,
    viewMode,
    dropPinMode,
    selectedInstanceKey,
    transformMode,
    transformOverrides,
    activeHotspotIds,
    pins,
  ]);

  // Sync instance visibility & transforms whenever state updates
  useEffect(() => {
    const map = instancesMapRef.current;
    if (isGizmoDraggingRef.current || isDirectDraggingRef.current) return;

    for (const pin of pins) {
      const pinVisible =
        viewMode === 'upgrade' && activeHotspotIds.includes(pin.id);
      const instances = getPinInstances(pin);
      for (const inst of instances) {
        const key = getInstanceOverrideKey(pin.id, inst.id);
        const placed = map.get(key);
        if (!placed) continue;
        const { pos, scale, rotation, stretch } = resolveInstanceTransform(
          pin,
          inst,
          transformOverrides[key]
        );
        placed.pivot.position.set(pos[0], pos[1], pos[2]);
        placed.pivot.rotation.set(rotation[0], rotation[1], rotation[2]);
        placed.pivot.scale.set(
          scale * stretch[0],
          scale * stretch[1],
          scale * stretch[2]
        );
        placed.pivot.visible = pinVisible;
      }
    }

    const custom = map.get('__custom__');
    if (custom) {
      custom.pivot.visible = viewMode === 'upgrade';
    }
  }, [pins, viewMode, activeHotspotIds, transformOverrides]);

  // Main Three.js + Spark.js lifecycle
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let rafId = 0;
    const instancesMap = instancesMapRef.current;
    const glbCache = glbCacheRef.current;
    const width = host.clientWidth || 800;
    const height = host.clientHeight || 600;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      onFallbackRef.current?.(
        err instanceof Error ? err.message : 'WebGL2 renderer failed'
      );
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#D9D3C7');
    sceneRef.current = scene;

    // Overcast environment IBL for realistic solar panel & steel reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.44;
    roomEnv.dispose();
    pmrem.dispose();

    // Calibrated overcast Lagos lighting
    const hemi = new THREE.HemisphereLight('#DCE5EE', '#4E463B', 0.68);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight('#F4ECD9', 1.15);
    sun.position.set(6, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 36;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    // Subtle shadow-catcher plane aligned near corridor ground (depthWrite: false preserves foreground splats)
    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.ShadowMaterial({ opacity: 0.3, depthWrite: false })
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.set(0, -0.34, -3.5);
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);

    // SparkRenderer for native .spz / .ply / .splat compositing inside Three.js
    const spark = new SparkRenderer({ renderer });
    scene.add(spark);

    const initCam = sharedCameraRef?.current ?? {
      position: [0.85, 1.85, 2.3] as [number, number, number],
      target: [-0.35, 0.85, -4.5] as [number, number, number],
    };

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(...initCam.position);
    cameraRef.current = camera;

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(...initCam.target);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.minDistance = 1.4;
    orbit.maxDistance = 10.5;
    orbit.maxPolarAngle = Math.PI * 0.495;
    orbit.update();
    orbitRef.current = orbit;

    const commitTransformFromPivot = (inst: PlacedInstance) => {
      const rx = roundCoord(inst.pivot.rotation.x);
      const ry = roundCoord(inst.pivot.rotation.y);
      const rz = roundCoord(inst.pivot.rotation.z);
      const avgScale =
        (inst.pivot.scale.x / inst.baseStretch[0] +
          inst.pivot.scale.y / inst.baseStretch[1] +
          inst.pivot.scale.z / inst.baseStretch[2]) /
        3;
      onUpdateTransformRef.current(inst.key, {
        position: [
          roundCoord(inst.pivot.position.x),
          roundCoord(inst.pivot.position.y),
          roundCoord(inst.pivot.position.z),
        ],
        modelScale: Math.max(0.15, roundCoord(avgScale)),
        rotationY: ry,
        rotation: [rx, ry, rz],
        locked: false,
      });
    };

    // TransformControls gizmo (Move G / Rotate R / Scale S)
    const transformCtrl = new TransformControls(camera, renderer.domElement);
    transformCtrl.setSize(0.72);
    transformCtrl.setMode(transformModeRef.current);
    const gizmoHelper = transformCtrl.getHelper();
    scene.add(gizmoHelper);
    transformCtrlRef.current = transformCtrl;

    transformCtrl.addEventListener('dragging-changed', (event) => {
      const dragging = Boolean(event.value);
      isGizmoDraggingRef.current = dragging;
      orbit.enabled = !dragging;
      cameraTweenRef.current.active = false;
      if (!dragging && transformCtrl.object) {
        const key = transformCtrl.object.userData?.instanceKey as
          | string
          | undefined;
        if (key) {
          const placed = instancesMapRef.current.get(key);
          if (placed) commitTransformFromPivot(placed);
        }
        setLiveHudReadout(null);
      }
    });

    transformCtrl.addEventListener('objectChange', () => {
      const obj = transformCtrl.object;
      if (!obj || !isGizmoDraggingRef.current) return;
      if (transformCtrl.mode === 'rotate') {
        const deg = Math.round(((obj.rotation.y * 180) / Math.PI + 360) % 360);
        setLiveHudReadout(`Rotate ${deg}°`);
      } else if (transformCtrl.mode === 'scale') {
        const key = obj.userData?.instanceKey as string | undefined;
        const placed = key ? instancesMapRef.current.get(key) : undefined;
        const factor = placed
          ? roundCoord(obj.scale.x / placed.baseStretch[0])
          : roundCoord(obj.scale.x);
        setLiveHudReadout(`Scale ${factor}×`);
      } else {
        setLiveHudReadout(
          `Pos [${roundCoord(obj.position.x)}, ${roundCoord(obj.position.y)}, ${roundCoord(obj.position.z)}]`
        );
      }
    });

    // Load 3DGS street splat via Spark.js
    const fetchUrl = resolveSplatUrl(splatSrc);
    let splatMesh: SplatMesh | null = null;
    try {
      splatMesh = new SplatMesh({
        url: fetchUrl,
        onLoad: () => {
          if (!disposed) setLoadingSplat(false);
        },
      });
      // Match Aholo World .spz coordinate system (+Z-up -> Three.js +Y-up)
      splatMesh.rotation.x = -Math.PI / 2;
      splatMesh.position.set(0, 1.6, 0);
      scene.add(splatMesh);
    } catch (err) {
      onFallbackRef.current?.(
        err instanceof Error ? err.message : 'Spark SplatMesh failed'
      );
      return;
    }

    const gltfLoader = new GLTFLoader();
    const contactTex = createContactShadowTexture();
    contactTexRef.current = contactTex;

    const getTemplate = (modelPath: string): Promise<GlbTemplate | null> => {
      const existing = glbCacheRef.current.get(modelPath);
      if (existing) return existing;
      const promise = new Promise<GlbTemplate | null>((resolve) => {
        gltfLoader.load(
          modelPath,
          (gltf) => {
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const finite =
              Number.isFinite(box.min.y) && Number.isFinite(box.max.y);
            resolve({
              scene: gltf.scene,
              minY: finite ? box.min.y : 0,
              centerX: finite ? (box.min.x + box.max.x) / 2 : 0,
              centerZ: finite ? (box.min.z + box.max.z) / 2 : 0,
              widthX: finite ? Math.max(0.4, box.max.x - box.min.x) : 1.0,
              depthZ: finite ? Math.max(0.4, box.max.z - box.min.z) : 1.0,
              height: finite ? Math.max(0.3, box.max.y - box.min.y) : 1.5,
            });
          },
          undefined,
          (err) => {
            console.warn('GLB failed to load in SparkSceneViewer:', modelPath, err);
            resolve(null);
          }
        );
      });
      glbCacheRef.current.set(modelPath, promise);
      return promise;
    };

    const spawnInstance = (
      key: string,
      pinId: string,
      instanceId: string,
      label: string,
      modelPath: string,
      tpl: GlbTemplate,
      pos: [number, number, number],
      scale: number,
      rotation: [number, number, number],
      stretch: [number, number, number],
      visible: boolean
    ) => {
      if (disposed || instancesMapRef.current.has(key)) return;
      const pivot = new THREE.Group();
      pivot.userData = { instanceKey: key, pinId, instanceId };

      const content = tpl.scene.clone(true);
      tuneGlbMaterials(content, modelPath);
      // Center horizontally & rest bottom flush on pivot y = 0
      content.position.set(-tpl.centerX, -tpl.minY, -tpl.centerZ);
      pivot.add(content);

      // Soft contact shadow decal directly beneath prop footprint
      const shadowGeo = new THREE.PlaneGeometry(
        tpl.widthX * 1.38,
        tpl.depthZ * 1.38
      );
      const shadowMat = new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.015;
      pivot.add(shadowMesh);

      pivot.position.set(pos[0], pos[1], pos[2]);
      pivot.rotation.set(rotation[0], rotation[1], rotation[2]);
      pivot.scale.set(
        scale * stretch[0],
        scale * stretch[1],
        scale * stretch[2]
      );
      pivot.visible = visible;
      scene.add(pivot);

      const placed: PlacedInstance = {
        key,
        pinId,
        instanceId,
        label,
        pivot,
        content,
        shadowMesh,
        baseScale: scale,
        baseStretch: stretch,
        height: tpl.height,
      };
      instancesMapRef.current.set(key, placed);

      // Attach gizmo immediately if this instance is currently selected & unlocked
      if (
        activeRef.current &&
        viewModeRef.current === 'upgrade' &&
        selectedKeyRef.current === key &&
        !overridesRef.current[key]?.locked
      ) {
        transformCtrl.attach(pivot);
      }
    };

    const loadAllCurrentPins = async () => {
      if (customGlbUrl) {
        const tpl = await getTemplate(customGlbUrl);
        if (tpl && !disposed) {
          spawnInstance(
            '__custom__',
            '__custom__',
            '0',
            'Custom Asset',
            customGlbUrl,
            tpl,
            [0, 0, 2.2],
            0.85,
            [0, 0, 0],
            [1, 1, 1],
            viewModeRef.current === 'upgrade'
          );
        }
      }

      await Promise.all(
        pinsRef.current.map(async (pin) => {
          const tpl = await getTemplate(pin.modelPath);
          if (!tpl || disposed) return;
          const instances = getPinInstances(pin);
          const pinVisible =
            viewModeRef.current === 'upgrade' &&
            activeIdsRef.current.includes(pin.id);

          for (const inst of instances) {
            const key = getInstanceOverrideKey(pin.id, inst.id);
            const { pos, scale, rotation, stretch } = resolveInstanceTransform(
              pin,
              inst,
              overridesRef.current[key]
            );
            spawnInstance(
              key,
              pin.id,
              inst.id,
              inst.label ?? pin.title,
              pin.modelPath,
              tpl,
              pos,
              scale,
              rotation,
              stretch,
              pinVisible
            );
          }
        })
      );
    };

    loadAllCurrentPins();

    // Direct cursor manipulation (Left-drag = X/Z Move, Shift+Drag = Height Y, Alt+Drag = 360° Yaw Rotate)
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();

    let directDrag: {
      placed: PlacedInstance;
      mode: 'move' | 'height' | 'rotate';
      downX: number;
      downY: number;
      startPos: THREE.Vector3;
      startRotY: number;
      dragPlane: THREE.Plane;
      grabOffset: THREE.Vector3;
      moved: boolean;
    } | null = null;
    let downX = 0;
    let downY = 0;
    let lastHoverTs = 0;

    const setRayFromClient = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(pointerNdc, camera);
      return true;
    };

    const pickInstanceAt = (
      clientX: number,
      clientY: number
    ): PlacedInstance | null => {
      if (dropModeRef.current || viewModeRef.current !== 'upgrade') return null;
      if (!setRayFromClient(clientX, clientY)) return null;

      const meshes: THREE.Object3D[] = [];
      for (const placed of instancesMapRef.current.values()) {
        if (placed.pivot.visible) meshes.push(placed.content);
      }
      if (meshes.length === 0) return null;

      const hits = raycaster.intersectObjects(meshes, true);
      if (hits.length === 0) return null;

      let cur: THREE.Object3D | null = hits[0].object;
      while (cur) {
        const key = cur.userData?.instanceKey as string | undefined;
        if (key && instancesMapRef.current.has(key)) {
          return instancesMapRef.current.get(key) ?? null;
        }
        cur = cur.parent;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!activeRef.current || e.button !== 0) return;
      // Let TransformControls handle clicks on its gizmo handles
      if (transformCtrl.axis !== null || isGizmoDraggingRef.current) return;

      downX = e.clientX;
      downY = e.clientY;
      cameraTweenRef.current.active = false;

      const picked = pickInstanceAt(e.clientX, e.clientY);
      if (!picked) return;

      const pin = pinsRef.current.find((p) => p.id === picked.pinId);
      if (pin) {
        onSelectPinRef.current(pin, {
          skipFly: true,
          instanceKey: picked.key,
        });
      }

      const isLocked = Boolean(overridesRef.current[picked.key]?.locked);
      if (isLocked) return;

      const mode: 'move' | 'height' | 'rotate' = e.altKey
        ? 'rotate'
        : e.shiftKey
          ? 'height'
          : 'move';

      const dragPlane = new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        -picked.pivot.position.y
      );
      const grabOffset = new THREE.Vector3();
      if (
        mode === 'move' &&
        setRayFromClient(e.clientX, e.clientY) &&
        raycaster.ray.intersectPlane(dragPlane, hitPoint)
      ) {
        grabOffset.subVectors(picked.pivot.position, hitPoint);
      }

      directDrag = {
        placed: picked,
        mode,
        downX: e.clientX,
        downY: e.clientY,
        startPos: picked.pivot.position.clone(),
        startRotY: picked.pivot.rotation.y,
        dragPlane,
        grabOffset,
        moved: false,
      };
      isDirectDraggingRef.current = true;
      orbit.enabled = false;
      setPropCursor('grabbing');
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activeRef.current) return;

      if (directDrag) {
        const dx = e.clientX - directDrag.downX;
        const dy = e.clientY - directDrag.downY;
        if (Math.hypot(dx, dy) > 3) directDrag.moved = true;

        const { placed } = directDrag;
        if (directDrag.mode === 'rotate' || e.altKey) {
          const nextRotY = directDrag.startRotY + dx * 0.012;
          placed.pivot.rotation.y = nextRotY;
          const deg = Math.round(((nextRotY * 180) / Math.PI + 360) % 360);
          setLiveHudReadout(`Rotate ${deg}°`);
        } else if (directDrag.mode === 'height' || e.shiftKey) {
          const nextY = clamp(directDrag.startPos.y - dy * 0.008, -1.2, 3.0);
          placed.pivot.position.y = nextY;
          setLiveHudReadout(`Height ${roundCoord(nextY)}m`);
        } else if (
          setRayFromClient(e.clientX, e.clientY) &&
          raycaster.ray.intersectPlane(directDrag.dragPlane, hitPoint)
        ) {
          placed.pivot.position.x = clamp(
            hitPoint.x + directDrag.grabOffset.x,
            -5.5,
            5.5
          );
          placed.pivot.position.z = clamp(
            hitPoint.z + directDrag.grabOffset.z,
            -7.0,
            1.5
          );
          setLiveHudReadout(
            `Pos [${roundCoord(placed.pivot.position.x)}, ${roundCoord(placed.pivot.position.y)}, ${roundCoord(placed.pivot.position.z)}]`
          );
        }
        return;
      }

      const now = performance.now();
      if (now - lastHoverTs > 60 && !isGizmoDraggingRef.current) {
        lastHoverTs = now;
        const hovered = pickInstanceAt(e.clientX, e.clientY);
        const locked = hovered
          ? Boolean(overridesRef.current[hovered.key]?.locked)
          : false;
        setPropCursor(hovered && !locked ? 'grab' : 'none');
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (directDrag) {
        const finished = directDrag;
        directDrag = null;
        isDirectDraggingRef.current = false;
        orbit.enabled = true;
        setPropCursor('grab');
        setLiveHudReadout(null);
        if (finished.moved) {
          commitTransformFromPivot(finished.placed);
        }
        return;
      }

      if (
        activeRef.current &&
        dropModeRef.current &&
        Math.hypot(e.clientX - downX, e.clientY - downY) <= 5 &&
        setRayFromClient(e.clientX, e.clientY)
      ) {
        const rawHit = raycaster.ray.intersectPlane(groundPlane, hitPoint)
          ? hitPoint
          : hitPoint
              .copy(raycaster.ray.origin)
              .addScaledVector(raycaster.ray.direction, 4.5);
        onDropRef.current([
          roundCoord(clamp(rawHit.x, -3.5, 3.5)),
          0,
          roundCoord(clamp(rawHit.z, -5.0, -0.4)),
        ]);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      const w = host.clientWidth || 800;
      const h = host.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(host);

    const projVec = new THREE.Vector3();
    let frameCount = 0;

    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);
      if (!activeRef.current) return;

      if (cameraTweenRef.current.active) {
        camera.position.lerp(cameraTweenRef.current.position, 0.1);
        orbit.target.lerp(cameraTweenRef.current.target, 0.1);
        if (
          camera.position.distanceTo(cameraTweenRef.current.position) < 0.02 &&
          orbit.target.distanceTo(cameraTweenRef.current.target) < 0.02
        ) {
          cameraTweenRef.current.active = false;
        }
      }

      orbit.update();

      // Publish live camera state for seamless Dual-Engine sync
      if (sharedCameraRef) {
        sharedCameraRef.current = {
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [orbit.target.x, orbit.target.y, orbit.target.z],
        };
      }

      renderer.render(scene, camera);

      // Project ONE hotspot tag per pin (anchored on primary instance 0)
      frameCount += 1;
      if (frameCount % 2 === 0) {
        const w = host.clientWidth || 800;
        const h = host.clientHeight || 600;
        const nextMarkers: ProjectedMarker[] = [];

        for (const pin of pinsRef.current) {
          const primaryKey = getInstanceOverrideKey(pin.id, '0');
          const placed = instancesMapRef.current.get(primaryKey);
          const pos = placed
            ? placed.pivot.position
            : new THREE.Vector3(...pin.position);
          const badgeLift =
            pin.fallbackKind === 'solar'
              ? 2.25
              : pin.fallbackKind === 'waste'
                ? 1.15
                : 0.58;

          projVec.set(pos.x, pos.y + badgeLift, pos.z);
          projVec.project(camera);
          const inFront = projVec.z >= -1 && projVec.z <= 1;
          nextMarkers.push({
            id: pin.id,
            x: (projVec.x * 0.5 + 0.5) * w,
            y: (-projVec.y * 0.5 + 0.5) * h,
            visible: inFront,
          });
        }
        setMarkers(nextMarkers);
      }
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      transformCtrl.detach();
      transformCtrl.dispose();
      orbit.dispose();
      splatMesh?.dispose?.();
      contactTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
      instancesMap.clear();
      glbCache.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      orbitRef.current = null;
      transformCtrlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splatSrc, customGlbUrl]);

  // Dynamically load newly dropped pins (Drop New Pin -> Instant Catalog / Lux3D)
  useEffect(() => {
    const scene = sceneRef.current;
    const contactTex = contactTexRef.current;
    if (!scene || !contactTex) return;
    const gltfLoader = new GLTFLoader();
    let cancelled = false;

    async function loadMissingPins() {
      for (const pin of pins) {
        const instances = getPinInstances(pin);
        for (const inst of instances) {
          const key = getInstanceOverrideKey(pin.id, inst.id);
          if (instancesMapRef.current.has(key)) continue;

          let promise = glbCacheRef.current.get(pin.modelPath);
          if (!promise) {
            promise = new Promise<GlbTemplate | null>((resolve) => {
              gltfLoader.load(
                pin.modelPath,
                (gltf) => {
                  const box = new THREE.Box3().setFromObject(gltf.scene);
                  const finite =
                    Number.isFinite(box.min.y) && Number.isFinite(box.max.y);
                  resolve({
                    scene: gltf.scene,
                    minY: finite ? box.min.y : 0,
                    centerX: finite ? (box.min.x + box.max.x) / 2 : 0,
                    centerZ: finite ? (box.min.z + box.max.z) / 2 : 0,
                    widthX: finite ? Math.max(0.4, box.max.x - box.min.x) : 1.0,
                    depthZ: finite ? Math.max(0.4, box.max.z - box.min.z) : 1.0,
                    height: finite ? Math.max(0.3, box.max.y - box.min.y) : 1.5,
                  });
                },
                undefined,
                () => resolve(null)
              );
            });
            glbCacheRef.current.set(pin.modelPath, promise);
          }

          const tpl = await promise;
          if (!tpl || cancelled || instancesMapRef.current.has(key)) continue;

          const { pos, scale, rotation, stretch } = resolveInstanceTransform(
            pin,
            inst,
            overridesRef.current[key]
          );
          const pivot = new THREE.Group();
          pivot.userData = { instanceKey: key, pinId: pin.id, instanceId: inst.id };

          const content = tpl.scene.clone(true);
          tuneGlbMaterials(content, pin.modelPath);
          content.position.set(-tpl.centerX, -tpl.minY, -tpl.centerZ);
          pivot.add(content);

          const shadowGeo = new THREE.PlaneGeometry(
            tpl.widthX * 1.38,
            tpl.depthZ * 1.38
          );
          const shadowMat = new THREE.MeshBasicMaterial({
            map: contactTex,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
          });
          const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
          shadowMesh.rotation.x = -Math.PI / 2;
          shadowMesh.position.y = 0.015;
          pivot.add(shadowMesh);

          pivot.position.set(pos[0], pos[1], pos[2]);
          pivot.rotation.set(rotation[0], rotation[1], rotation[2]);
          pivot.scale.set(
            scale * stretch[0],
            scale * stretch[1],
            scale * stretch[2]
          );
          pivot.visible =
            viewModeRef.current === 'upgrade' &&
            activeIdsRef.current.includes(pin.id);

          scene?.add(pivot);
          instancesMapRef.current.set(key, {
            key,
            pinId: pin.id,
            instanceId: inst.id,
            label: inst.label ?? pin.title,
            pivot,
            content,
            shadowMesh,
            baseScale: scale,
            baseStretch: stretch,
            height: tpl.height,
          });

          if (
            selectedKeyRef.current === key &&
            !overridesRef.current[key]?.locked &&
            transformCtrlRef.current
          ) {
            transformCtrlRef.current.attach(pivot);
          }
        }
      }
    }

    loadMissingPins();
    return () => {
      cancelled = true;
    };
  }, [pins]);

  // Selected instance metadata for floating in-viewport gizmo bar
  const activeKey = selectedInstanceKey;
  const isSelectedLocked = activeKey
    ? Boolean(transformOverrides[activeKey]?.locked)
    : false;
  const activeInstanceLabel = (() => {
    if (!activeKey) return null;
    const { pinId, instanceId } = parseInstanceOverrideKey(activeKey);
    const pin = pins.find((p) => p.id === pinId);
    if (!pin) return null;
    const inst = getPinInstances(pin).find((i) => i.id === instanceId);
    return inst?.label ?? pin.title;
  })();

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

      {/* Floating In-Viewport Gizmo Toolbar when an instance is selected in Upgrade mode */}
      {active && viewMode === 'upgrade' && activeKey && activeInstanceLabel && !dropPinMode && (
        <div className="pointer-events-none absolute top-4 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-1.5 md:flex">
          <div className="hud-glass pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1.5 shadow-lg">
            <span className="max-w-[140px] truncate px-2 text-[11px] font-bold text-[#111312]">
              {activeInstanceLabel}
            </span>
            <div className="h-4 w-px bg-[var(--hud-border-light)]" />
            <button
              type="button"
              disabled={isSelectedLocked}
              onClick={() => onChangeTransformMode('translate')}
              title="Move prop (G) · Shift+Drag for height"
              className={`hud-transition inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-40 ${
                transformMode === 'translate'
                  ? 'bg-[#0F4C4C] text-white'
                  : 'text-[#4A504C] hover:bg-white'
              }`}
            >
              <Move className="h-3 w-3" />
              Move
            </button>
            <button
              type="button"
              disabled={isSelectedLocked}
              onClick={() => onChangeTransformMode('rotate')}
              title="Rotate prop (R) · or Alt+Drag directly"
              className={`hud-transition inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-40 ${
                transformMode === 'rotate'
                  ? 'bg-[#0F4C4C] text-white'
                  : 'text-[#4A504C] hover:bg-white'
              }`}
            >
              <RotateCw className="h-3 w-3" />
              Rotate
            </button>
            <button
              type="button"
              disabled={isSelectedLocked}
              onClick={() => onChangeTransformMode('scale')}
              title="Scale prop (S)"
              className={`hud-transition inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-40 ${
                transformMode === 'scale'
                  ? 'bg-[#0F4C4C] text-white'
                  : 'text-[#4A504C] hover:bg-white'
              }`}
            >
              <Scaling className="h-3 w-3" />
              Scale
            </button>
            <div className="h-4 w-px bg-[var(--hud-border-light)]" />
            <button
              type="button"
              onClick={() => onToggleLockKey(activeKey)}
              title="Lock or unlock position (L)"
              className={`hud-transition inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                isSelectedLocked
                  ? 'bg-[#B45309] text-white'
                  : 'bg-[#1B6E2D] text-white'
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
            {transformOverrides[activeKey] && (
              <button
                type="button"
                onClick={() => onResetTransformKey(activeKey)}
                title="Reset prop transform"
                className="hud-transition inline-flex items-center justify-center rounded-full p-1 text-[#4A504C] hover:bg-white hover:text-[#C85A32]"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="hud-glass-dark tabular-mono rounded-full px-3 py-0.5 text-[10px] font-medium text-white/90">
            {liveHudReadout ??
              'Drag: Move · Shift+Drag: Height · Alt+Drag: Rotate · [G/R/S/L]'}
          </div>
        </div>
      )}

      {/* Projected 3D HTML hotspot overlays (1 tag per asset group) */}
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
