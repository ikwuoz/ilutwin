'use client';

import React, { Component, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Gltf,
  OrbitControls,
  Splat,
  TransformControls,
} from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { HotspotBadge } from '@/components/HotspotBadge';
import {
  BASE_STREET_SPLAT_PATH,
  type CommunityProblemPin,
  type TransformMode,
  type TransformOverride,
  type ViewMode,
} from '@/lib/data/upgrades';

interface SceneViewerProps {
  pins: CommunityProblemPin[];
  viewMode: ViewMode;
  selectedPinId: string | null;
  onSelectPin: (pin: CommunityProblemPin | null) => void;
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
  transformOverrides: Record<string, TransformOverride>;
  onUpdateTransform: (pinId: string, next: TransformOverride) => void;
  customGlbUrl?: string | null;
  customSplatUrl?: string | null;
  onSplatStatusChange?: (status: 'checking' | 'loaded' | 'fallback') => void;
}

class ModelErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const DEFAULT_CAMERA_POS = new THREE.Vector3(9.5, 6.8, 10.5);
const DEFAULT_TARGET = new THREE.Vector3(0, 1.0, 0);

function CameraRig({
  cameraGoal,
  paused,
}: {
  cameraGoal: {
    position: [number, number, number];
    target: [number, number, number];
    seq: number;
  } | null;
  paused: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const animatingRef = useRef(false);
  const goalPosRef = useRef(DEFAULT_CAMERA_POS.clone());
  const goalTargetRef = useRef(DEFAULT_TARGET.clone());

  useEffect(() => {
    if (cameraGoal && cameraGoal.seq > 0 && !paused) {
      goalPosRef.current.set(...cameraGoal.position);
      goalTargetRef.current.set(...cameraGoal.target);
      animatingRef.current = true;
    }
  }, [cameraGoal, paused]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (animatingRef.current && !paused) {
      const alpha = Math.min(1, delta * 4.5);
      camera.position.lerp(goalPosRef.current, alpha);
      controls.target.lerp(goalTargetRef.current, alpha);

      if (
        camera.position.distanceTo(goalPosRef.current) < 0.08 &&
        controls.target.distanceTo(goalTargetRef.current) < 0.08
      ) {
        animatingRef.current = false;
      }
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={2.5}
      maxDistance={28}
      onStart={() => {
        animatingRef.current = false;
      }}
    />
  );
}

function LagosCompoundHouse({
  position,
  elevated,
  roofColor,
  wallColor,
}: {
  position: [number, number, number];
  elevated: boolean;
  roofColor: string;
  wallColor: string;
}) {
  const stiltHeight = elevated ? 0.75 : 0;
  const pierOffsets: [number, number][] = [
    [-1.1, -0.9],
    [1.1, -0.9],
    [-1.1, 0.9],
    [1.1, 0.9],
  ];

  return (
    <group position={position}>
      {elevated &&
        pierOffsets.map(([ox, oz], idx) => (
          <mesh
            key={idx}
            position={[ox, stiltHeight / 2, oz]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.09, 0.11, stiltHeight, 10]} />
            <meshStandardMaterial color="#6B7280" roughness={0.8} />
          </mesh>
        ))}

      <mesh position={[0, stiltHeight + 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.8, 2.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>

      <mesh
        position={[0, stiltHeight + 2.2, 0]}
        rotation={[0, Math.PI / 4, 0]}
        castShadow
      >
        <coneGeometry args={[2.05, 0.85, 4]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={0.55}
          metalness={0.22}
        />
      </mesh>
    </group>
  );
}

function ProceduralLagosStreet({ viewMode }: { viewMode: ViewMode }) {
  const isUpgraded = viewMode === 'upgrade';

  return (
    <group>
      {/* Laterite street ground */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial
          color={isUpgraded ? '#B79674' : '#9B7558'}
          roughness={0.92}
        />
      </mesh>

      {/* Street compound homes */}
      <LagosCompoundHouse
        position={[-4.3, 0, -3.5]}
        elevated={isUpgraded}
        roofColor="#B84A2E"
        wallColor="#E7D5BE"
      />
      <LagosCompoundHouse
        position={[-4.3, 0, 1.4]}
        elevated={isUpgraded}
        roofColor="#7F5539"
        wallColor="#DFC9AE"
      />
      <LagosCompoundHouse
        position={[4.3, 0, -3.2]}
        elevated={isUpgraded}
        roofColor="#9E3E26"
        wallColor="#EADBC8"
      />
      <LagosCompoundHouse
        position={[4.3, 0, 1.8]}
        elevated={isUpgraded}
        roofColor="#6B705C"
        wallColor="#D8C3A5"
      />

      {/* Current Reality: standing floodwater puddle & loose refuse vs Upgrade: lined gutters */}
      {!isUpgraded ? (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.4, 0.02, 1.3]}>
            <circleGeometry args={[1.45, 28]} />
            <meshStandardMaterial
              color="#5C6F68"
              roughness={0.18}
              metalness={0.28}
            />
          </mesh>
          <mesh position={[1.7, 0.14, -4.2]} castShadow>
            <dodecahedronGeometry args={[0.35, 0]} />
            <meshStandardMaterial color="#6B5E4F" roughness={0.95} />
          </mesh>
          <mesh position={[2.1, 0.11, -4.5]} castShadow>
            <dodecahedronGeometry args={[0.26, 0]} />
            <meshStandardMaterial color="#8A7968" roughness={0.95} />
          </mesh>
        </group>
      ) : (
        <group>
          {[-1.75, 1.75].map((x) => (
            <group key={x} position={[x, 0, -0.5]}>
              <mesh position={[0, 0.06, 0]} receiveShadow>
                <boxGeometry args={[0.56, 0.14, 13]} />
                <meshStandardMaterial color="#7F8C8D" roughness={0.75} />
              </mesh>
              <mesh position={[0, 0.11, 0]}>
                <boxGeometry args={[0.32, 0.08, 12.8]} />
                <meshStandardMaterial color="#2A9D8F" roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

function StreetDropPlane({
  enabled,
  onDropPinAt,
}: {
  enabled: boolean;
  onDropPinAt: (coords: [number, number, number]) => void;
}) {
  const [hoverPoint, setHoverPoint] = useState<[number, number, number] | null>(
    null
  );

  if (!enabled) return null;

  const round = (n: number) => Math.round(n * 100) / 100;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        onPointerMove={(e) => {
          e.stopPropagation();
          setHoverPoint([round(e.point.x), 0.04, round(e.point.z)]);
        }}
        onPointerOut={() => setHoverPoint(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 5) return; // Ignore orbit drags
          onDropPinAt([round(e.point.x), 0, round(e.point.z)]);
        }}
      >
        <planeGeometry args={[32, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {hoverPoint && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={hoverPoint}>
          <ringGeometry args={[0.25, 0.42, 24]} />
          <meshBasicMaterial color="#C85A32" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function FallbackUpgradeMesh({
  kind,
  hasLight,
}: {
  kind: CommunityProblemPin['fallbackKind'];
  hasLight: boolean;
}) {
  if (kind === 'drain') {
    return (
      <group>
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.76, 0.22, 3.6]} />
          <meshStandardMaterial color="#64748B" roughness={0.65} />
        </mesh>
        {[-1.2, -0.4, 0.4, 1.2].map((z) => (
          <mesh key={z} position={[0, 0.21, z]} castShadow>
            <boxGeometry args={[0.64, 0.05, 0.54]} />
            <meshStandardMaterial
              color="#334155"
              metalness={0.55}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === 'solar') {
    return (
      <group>
        <mesh position={[0, 1.8, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 3.6, 12]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.5} />
        </mesh>
        <mesh position={[0, 3.65, 0]} rotation={[0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.72, 0.07, 0.48]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.35} />
        </mesh>
        <mesh position={[0.35, 3.35, 0]}>
          <sphereGeometry args={[0.15, 14, 14]} />
          <meshStandardMaterial
            color="#FEF08A"
            emissive="#F59E0B"
            emissiveIntensity={hasLight ? 2.1 : 0.4}
          />
        </mesh>
        {hasLight && (
          <pointLight
            position={[0.4, 3.15, 0]}
            color="#FBBF24"
            intensity={4.2}
            distance={9}
          />
        )}
      </group>
    );
  }

  if (kind === 'walkway') {
    return (
      <group>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.65, 0.14, 3.6]} />
          <meshStandardMaterial color="#A47148" roughness={0.8} />
        </mesh>
        {[-1.3, 0, 1.3].map((z) =>
          [-0.68, 0.68].map((x) => (
            <mesh key={`${x}-${z}`} position={[x, 0.27, z]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.55, 8]} />
              <meshStandardMaterial color="#4B5563" />
            </mesh>
          ))
        )}
      </group>
    );
  }

  // Waste hub
  const binColors = ['#1F6E43', '#D9822B', '#0F4C4C'];
  return (
    <group>
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.65, 0.24, 1.1]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.85} />
      </mesh>
      {[-0.48, 0, 0.48].map((x, idx) => (
        <mesh key={x} position={[x, 0.56, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.16, 0.65, 14]} />
          <meshStandardMaterial color={binColors[idx]} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.28, 0]} castShadow>
        <boxGeometry args={[1.75, 0.08, 1.2]} />
        <meshStandardMaterial color="#C85A32" roughness={0.6} />
      </mesh>
    </group>
  );
}

function UpgradeProp({
  pin,
  visible,
  shouldLoadGltf,
  position,
  scale,
  rotation,
  stretch,
  showGizmo,
  transformMode,
  onGizmoDragChange,
  onCommitTransform,
}: {
  pin: CommunityProblemPin;
  visible: boolean;
  shouldLoadGltf: boolean;
  position: [number, number, number];
  scale: number;
  rotation: [number, number, number];
  stretch: [number, number, number];
  showGizmo: boolean;
  transformMode: TransformMode;
  onGizmoDragChange: (dragging: boolean) => void;
  onCommitTransform: (next: TransformOverride) => void;
}) {
  const [targetObj, setTargetObj] = useState<THREE.Group | null>(null);
  const animGroupRef = useRef<THREE.Group | null>(null);
  const progressRef = useRef(visible ? 1 : 0);

  useFrame((_, delta) => {
    const g = animGroupRef.current;
    if (!g) return;
    const goal = visible ? 1 : 0;
    progressRef.current = THREE.MathUtils.lerp(
      progressRef.current,
      goal,
      Math.min(1, delta * 9)
    );
    const s = Math.max(0.001, progressRef.current);
    g.scale.setScalar(s);
    g.visible = progressRef.current > 0.02;
  });

  const fallback = (
    <FallbackUpgradeMesh kind={pin.fallbackKind} hasLight={visible} />
  );

  return (
    <>
      <group
        ref={setTargetObj}
        position={position}
        rotation={rotation}
        scale={[scale * stretch[0], scale * stretch[1], scale * stretch[2]]}
      >
        <group ref={animGroupRef}>
          {shouldLoadGltf ? (
            <ModelErrorBoundary fallback={fallback}>
              <Suspense fallback={fallback}>
                <Gltf src={pin.modelPath} />
              </Suspense>
            </ModelErrorBoundary>
          ) : (
            fallback
          )}
        </group>
      </group>

      {showGizmo && visible && targetObj && (
        <TransformControls
          object={targetObj}
          mode={transformMode}
          size={0.75}
          onMouseDown={() => onGizmoDragChange(true)}
          onMouseUp={() => onGizmoDragChange(false)}
          onObjectChange={() => {
            if (!targetObj) return;
            const round = (n: number) => Math.round(n * 100) / 100;
            onCommitTransform({
              position: [
                round(targetObj.position.x),
                round(targetObj.position.y),
                round(targetObj.position.z),
              ],
              modelScale: Math.max(0.1, round(targetObj.scale.x)),
              rotationY: rotation[1],
            });
          }}
        />
      )}
    </>
  );
}

function ProblemPinMarker({
  pin,
  position,
  isSelected,
  isUpgradeActive,
  onSelect,
}: {
  pin: CommunityProblemPin;
  position: [number, number, number];
  isSelected: boolean;
  isUpgradeActive: boolean;
  onSelect: (pin: CommunityProblemPin) => void;
}) {
  const markerY = position[1] + (pin.fallbackKind === 'solar' ? 2.45 : 1.35);

  return (
    <group position={[position[0], markerY, position[2]]}>
      <mesh onClick={() => onSelect(pin)}>
        <sphereGeometry args={[isSelected ? 0.16 : 0.12, 16, 16]} />
        <meshStandardMaterial
          color={isUpgradeActive ? '#1F6E43' : '#C85A32'}
          emissive={isUpgradeActive ? '#22C55E' : '#F59E0B'}
          emissiveIntensity={0.65}
        />
      </mesh>
    </group>
  );
}

function PinScreenProjector({
  pins,
  transformOverrides,
  markerElsRef,
}: {
  pins: CommunityProblemPin[];
  transformOverrides: Record<string, TransformOverride>;
  markerElsRef: React.MutableRefObject<Map<string, HTMLDivElement>>;
}) {
  const { camera, size } = useThree();
  const projVecRef = useRef(new THREE.Vector3());

  useFrame(() => {
    const v = projVecRef.current;
    for (const pin of pins) {
      const el = markerElsRef.current.get(pin.id);
      if (!el) continue;

      const pos = transformOverrides[pin.id]?.position ?? pin.position;
      const markerY = pos[1] + (pin.fallbackKind === 'solar' ? 2.45 : 1.35);
      v.set(pos[0], markerY, pos[2]).project(camera);

      const inBounds =
        v.z >= -1 &&
        v.z <= 1 &&
        v.x >= -1.1 &&
        v.x <= 1.1 &&
        v.y >= -1.1 &&
        v.y <= 1.1;

      if (!inBounds) {
        if (el.style.display !== 'none') {
          el.style.display = 'none';
        }
        continue;
      }

      const x = Math.round(((v.x + 1) / 2) * size.width);
      const y = Math.round(((-v.y + 1) / 2) * size.height);
      if (el.style.display !== 'block') {
        el.style.display = 'block';
      }
      el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`;
    }
  });

  return null;
}

export function SceneViewer({
  pins,
  viewMode,
  selectedPinId,
  onSelectPin,
  activeHotspotIds,
  cameraGoal,
  dropPinMode,
  onDropPinAt,
  devTransformEnabled,
  transformMode,
  transformOverrides,
  onUpdateTransform,
  customGlbUrl,
  customSplatUrl,
  onSplatStatusChange,
}: SceneViewerProps) {
  const [resolvedSplatUrl, setResolvedSplatUrl] = useState<string | null>(null);
  const [availableLocalGlbs, setAvailableLocalGlbs] = useState<
    Record<string, boolean>
  >({});
  const [isDraggingGizmo, setIsDraggingGizmo] = useState(false);
  const markerElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function probeSplat() {
      onSplatStatusChange?.('checking');
      if (customSplatUrl && /\.splat(\?|$)/i.test(customSplatUrl)) {
        if (!cancelled) {
          setResolvedSplatUrl(customSplatUrl);
          onSplatStatusChange?.('loaded');
        }
        return;
      }
      try {
        const res = await fetch(BASE_STREET_SPLAT_PATH, { method: 'HEAD' });
        if (!cancelled) {
          if (res.ok) {
            setResolvedSplatUrl(BASE_STREET_SPLAT_PATH);
            onSplatStatusChange?.('loaded');
          } else {
            setResolvedSplatUrl(null);
            onSplatStatusChange?.('fallback');
          }
        }
      } catch {
        if (!cancelled) {
          setResolvedSplatUrl(null);
          onSplatStatusChange?.('fallback');
        }
      }
    }

    probeSplat();
    return () => {
      cancelled = true;
    };
  }, [customSplatUrl, onSplatStatusChange]);

  useEffect(() => {
    let cancelled = false;
    const localPaths = Array.from(
      new Set(
        pins
          .map((p) => p.modelPath)
          .filter((path) => path.startsWith('/models/'))
      )
    );

    async function probeLocalGlbs() {
      const checks = await Promise.all(
        localPaths.map(async (path) => {
          try {
            const res = await fetch(path, { method: 'HEAD' });
            return [path, res.ok] as const;
          } catch {
            return [path, false] as const;
          }
        })
      );
      if (!cancelled) {
        setAvailableLocalGlbs(Object.fromEntries(checks));
      }
    }

    probeLocalGlbs();
    return () => {
      cancelled = true;
    };
  }, [pins]);

  const isUpgradedWithSolar =
    viewMode === 'upgrade' &&
    pins.some(
      (p) =>
        activeHotspotIds.includes(p.id) && p.fallbackKind === 'solar'
    );

  return (
    <div
      className={`relative h-full w-full ${
        dropPinMode ? 'cursor-crosshair' : ''
      }`}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [9.5, 6.8, 10.5], fov: 46 }}
        className="h-full w-full"
      >
        <color
          attach="background"
          args={[isUpgradedWithSolar ? '#1B2A38' : '#EAE0D0']}
        />
        <fog
          attach="fog"
          args={[isUpgradedWithSolar ? '#1B2A38' : '#EAE0D0', 20, 48]}
        />

        {/* Subtle ambient + directional lighting */}
        <ambientLight
          intensity={isUpgradedWithSolar ? 0.65 : 0.95}
          color={isUpgradedWithSolar ? '#94A3B8' : '#FFF8EB'}
        />
        <directionalLight
          position={[10, 14, 8]}
          intensity={isUpgradedWithSolar ? 0.75 : 1.55}
          color={isUpgradedWithSolar ? '#BFDBFE' : '#FFF3DB'}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Base street: Aholo/local .splat when available, procedural street fallback otherwise */}
        {resolvedSplatUrl ? (
          <ModelErrorBoundary
            fallback={<ProceduralLagosStreet viewMode={viewMode} />}
          >
            <Suspense fallback={<ProceduralLagosStreet viewMode={viewMode} />}>
              <Splat src={resolvedSplatUrl} />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          <ProceduralLagosStreet viewMode={viewMode} />
        )}

        {/* Street raycast plane for interactive "Drop New Pin" clicks */}
        <StreetDropPlane enabled={dropPinMode} onDropPinAt={onDropPinAt} />

        {/* Lux3D upgrade props at exact [x, y, z] & scale */}
        {pins.map((pin) => {
          const override = transformOverrides[pin.id];
          const pos = override?.position ?? pin.position;
          const scale = override?.modelScale ?? pin.modelScale;
          const baseRot = pin.rotation ?? [0, pin.rotationY ?? 0, 0];
          const rotation: [number, number, number] = [
            baseRot[0],
            override?.rotationY ?? baseRot[1],
            baseRot[2],
          ];
          const stretch: [number, number, number] = pin.modelStretch ?? [1, 1, 1];
          const visible =
            viewMode === 'upgrade' && activeHotspotIds.includes(pin.id);
          const isRemoteOrProxied =
            pin.modelPath.startsWith('/api/') ||
            pin.modelPath.startsWith('http');
          const shouldLoadGltf =
            isRemoteOrProxied || Boolean(availableLocalGlbs[pin.modelPath]);

          return (
            <UpgradeProp
              key={pin.id}
              pin={pin}
              visible={visible}
              shouldLoadGltf={shouldLoadGltf}
              position={pos}
              scale={scale}
              rotation={rotation}
              stretch={stretch}
              showGizmo={
                !override?.locked &&
                devTransformEnabled &&
                !dropPinMode &&
                pin.id === selectedPinId
              }
              transformMode={transformMode}
              onGizmoDragChange={setIsDraggingGizmo}
              onCommitTransform={(next) => onUpdateTransform(pin.id, next)}
            />
          );
        })}

        {/* Optional custom Lux3D GLB passed from /upload (?glb=...) */}
        {customGlbUrl && viewMode === 'upgrade' && (
          <ModelErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <Gltf src={customGlbUrl} position={[0, 0.1, 3.2]} scale={1.2} />
            </Suspense>
          </ModelErrorBoundary>
        )}

        {/* Pulsing 3D HTML hotspot markers */}
        {pins.map((pin) => {
          const pos = transformOverrides[pin.id]?.position ?? pin.position;
          const isUpgradeActive =
            viewMode === 'upgrade' && activeHotspotIds.includes(pin.id);

          return (
            <ProblemPinMarker
              key={pin.id}
              pin={pin}
              position={pos}
              isSelected={pin.id === selectedPinId}
              isUpgradeActive={isUpgradeActive}
              onSelect={(picked) =>
                onSelectPin(picked.id === selectedPinId ? null : picked)
              }
            />
          );
        })}

        <CameraRig
          cameraGoal={cameraGoal}
          paused={isDraggingGizmo || devTransformEnabled || dropPinMode}
        />

        <PinScreenProjector
          pins={pins}
          transformOverrides={transformOverrides}
          markerElsRef={markerElsRef}
        />
      </Canvas>

      {/* Single-root HTML overlay for 3D pin badges (avoids Drei <Html> React 19 createRoot unmount race) */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {pins.map((pin) => {
          const isSelected = pin.id === selectedPinId;
          const isUpgradeActive =
            viewMode === 'upgrade' && activeHotspotIds.includes(pin.id);

          return (
            <div
              key={pin.id}
              ref={(el) => {
                if (el) {
                  markerElsRef.current.set(pin.id, el);
                } else {
                  markerElsRef.current.delete(pin.id);
                }
              }}
              style={{ display: 'none' }}
              className={`pointer-events-auto absolute top-0 left-0 ${
                isSelected ? 'z-20' : 'z-10'
              }`}
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
