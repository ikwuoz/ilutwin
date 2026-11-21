export type ViewMode = 'current' | 'upgrade';

export type PinCategory =
  | 'Flooding'
  | 'No Streetlight'
  | 'Waste Overflow'
  | 'Open Drain'
  | 'Dark Alley'
  | 'Flooded Walkway'
  | 'Custom Upgrade';

export type ReportIssueType =
  | 'Open Drain'
  | 'Dark Alley'
  | 'Flooded Walkway'
  | 'Custom Prompt';

export type UnitKind =
  | 'drainage_m'
  | 'solar_lamp'
  | 'waste_hub'
  | 'walkway_m'
  | 'custom_unit';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface PropInstance {
  /** Instance suffix within a pin group ("0", "1", ...). Index "0" is the primary tagged instance. */
  id: string;
  label?: string;
  position: [number, number, number];
  modelScale?: number;
  modelStretch?: [number, number, number];
  rotationY?: number;
  rotation?: [number, number, number];
}

export interface TransformOverride {
  position: [number, number, number];
  modelScale: number;
  rotationY?: number;
  rotation?: [number, number, number];
  locked?: boolean;
}

export interface CameraPreset {
  id: 'overview' | 'drainage' | 'lighting' | 'waste';
  label: string;
  shortcut: string;
  position: [number, number, number];
  target: [number, number, number];
  pinId?: string;
}

export interface CommunityProblemPin {
  id: string;
  title: string;
  locationLabel: string;
  category: PinCategory;
  severity: 'high' | 'medium';
  residentNote: string;
  proposedFix: string;
  impactMetric: string;
  /** Structured civic impact & budget fields */
  unitKind: UnitKind;
  unitAmount: number;
  estimatedCostNgn: number;
  /** Optional per-instance cost & unit amount for auto-computed corridor arrays */
  unitCostNgn?: number;
  unitAmountPerInstance?: number;
  householdsImpacted: number;
  /** Pin & primary Lux3D prop coordinates [x, y, z] in the 3D street scene */
  position: [number, number, number];
  /** Uniform scale for the Lux3D .glb prop */
  modelScale: number;
  /** Optional local axis stretch multipliers [sx, sy, sz] */
  modelStretch?: [number, number, number];
  /** Optional Y-axis yaw rotation in radians */
  rotationY?: number;
  /** Optional Euler rotation [rx, ry, rz] in radians */
  rotation?: [number, number, number];
  /**
   * Optional multi-instance array along the street corridor.
   * Only the primary instance (index 0) displays the floating tag, while all
   * instances render in 3D and automatically roll up into cost & impact totals.
   */
  instances?: PropInstance[];
  /** Smooth camera viewpoint when user focuses this hotspot */
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  /** Local GLB path under /public/models/ or proxied Aholo Lux3D GLB URL */
  modelPath: string;
  /** Fallback procedural primitive type when local GLB is absent */
  fallbackKind: 'drain' | 'solar' | 'waste' | 'walkway';
  /** Ready-to-run Lux3D prompt to regenerate or customize this asset */
  lux3dPrompt: string;
  /** True when created interactively by a resident in the 3D explorer */
  isUserCreated?: boolean;
  /** Whether the active model came from live Aholo Lux3D or instant catalog */
  source?: 'aholo-lux3d' | 'local-fallback' | 'preset';
}

export interface IssueCatalogTemplate {
  issueType: ReportIssueType;
  category: PinCategory;
  title: string;
  defaultPrompt: string;
  fallbackModelPath: string;
  fallbackKind: CommunityProblemPin['fallbackKind'];
  defaultResidentNote: string;
  proposedFix: string;
  impactMetric: string;
  unitKind: UnitKind;
  unitAmount: number;
  estimatedCostNgn: number;
  householdsImpacted: number;
}

export interface CivicImpactSummary {
  activeCount: number;
  plannedCount: number;
  totalCostNgn: number;
  plannedCostNgn: number;
  householdsImpacted: number;
  plannedHouseholdsImpacted: number;
  counts: {
    drainageMeters: number;
    solarLamps: number;
    wasteHubs: number;
    walkwayMeters: number;
    customUnits: number;
  };
  activePins: CommunityProblemPin[];
  plannedPins: CommunityProblemPin[];
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortcut: '1',
    position: [0.85, 1.85, 2.3],
    target: [-0.35, 0.85, -4.5],
  },
  {
    id: 'drainage',
    label: 'Drainage Hotspot',
    shortcut: '2',
    position: [1.65, 1.55, -0.1],
    target: [-0.05, 0.12, -2.7],
    pinId: 'pin-flooding',
  },
  {
    id: 'lighting',
    label: 'Alley Lighting',
    shortcut: '3',
    position: [1.4, 2.0, -0.4],
    target: [-0.65, 1.35, -4.24],
    pinId: 'pin-streetlight',
  },
  {
    id: 'waste',
    label: 'Waste Hub',
    shortcut: '4',
    position: [-0.1, 1.85, -0.5],
    target: [1.0, 0.78, -4.18],
    pinId: 'pin-waste',
  },
];

export const REPORT_ISSUE_TEMPLATES: IssueCatalogTemplate[] = [
  {
    issueType: 'Open Drain',
    category: 'Open Drain',
    title: 'Covered Storm Drain',
    defaultPrompt:
      'A modular precast concrete street drainage channel segment with removable slotted metal grate covers for narrow alleys in Lagos Nigeria, realistic 3D model, clean background',
    fallbackModelPath: '/models/drain_cover.glb',
    fallbackKind: 'drain',
    defaultResidentNote:
      '"Open gutter floods across the footpath whenever rain starts."',
    proposedFix: 'Precast concrete drain channel with slotted cover grate.',
    impactMetric: '-75% standing floodwater',
    unitKind: 'drainage_m',
    unitAmount: 10,
    estimatedCostNgn: 320_000,
    householdsImpacted: 24,
  },
  {
    issueType: 'Dark Alley',
    category: 'Dark Alley',
    title: 'Solar LED Streetlight',
    defaultPrompt:
      'An off-grid community solar LED streetlight pole with angled photovoltaic panel on top and dual warm LED lamps for Lagos streets, realistic 3D model, clean background',
    fallbackModelPath: '/models/solar_lamp.glb',
    fallbackKind: 'solar',
    defaultResidentNote:
      '"No lighting after dusk makes evening walking and trading unsafe."',
    proposedFix: 'Off-grid solar LED streetlamp with battery enclosure.',
    impactMetric: '+3.5 hrs safe evening light',
    unitKind: 'solar_lamp',
    unitAmount: 1,
    estimatedCostNgn: 350_000,
    householdsImpacted: 30,
  },
  {
    issueType: 'Flooded Walkway',
    category: 'Flooded Walkway',
    title: 'Elevated Pedestrian Bridge',
    defaultPrompt:
      'An elevated concrete and treated timber pedestrian footbridge segment with sturdy support piers and simple side handrails for flooded urban alleys in Lagos, realistic 3D model, clean background',
    fallbackModelPath: '/models/drain_cover.glb',
    fallbackKind: 'walkway',
    defaultResidentNote:
      '"Mud and standing water block school children and pushcarts here."',
    proposedFix: 'Raised all-weather pedestrian bridge above storm runoff.',
    impactMetric: '+0.6 m dry walkway clearance',
    unitKind: 'walkway_m',
    unitAmount: 8,
    estimatedCostNgn: 420_000,
    householdsImpacted: 35,
  },
  {
    issueType: 'Custom Prompt',
    category: 'Custom Upgrade',
    title: 'Custom Community Upgrade',
    defaultPrompt:
      'Elevated concrete pedestrian bridge with side drainage channel for a Lagos neighborhood street, realistic architectural 3D model, clean background',
    fallbackModelPath: '/models/waste_hub.glb',
    fallbackKind: 'waste',
    defaultResidentNote:
      '"Community-proposed infrastructure fix pinned directly on the street."',
    proposedFix: 'Custom Lux3D-generated community infrastructure asset.',
    impactMetric: 'Resident co-designed fix',
    unitKind: 'custom_unit',
    unitAmount: 1,
    estimatedCostNgn: 280_000,
    householdsImpacted: 20,
  },
];

export const BASE_STREET_SPLAT_PATH = '/models/lagos_street.splat';

export const BASE_STREET_SPLAT_CANDIDATES = [
  '/models/lagos_street.spz',
  '/models/lagos_street.splat',
  '/models/lagos_street.ply',
] as const;

export const COMMUNITY_PROBLEM_PINS: CommunityProblemPin[] = [
  {
    id: 'pin-flooding',
    title: 'Flooded Alley Junction',
    locationLabel: 'South Drain Edge · Plot 12',
    category: 'Flooding',
    severity: 'high',
    residentNote:
      '"Water reaches our compound step every time it rains for 20 minutes—kids wade through dirty runoff on their way to school."',
    proposedFix:
      'Install continuous modular precast concrete drainage slabs with slotted steel grates across the full visible street gutter.',
    impactMetric: '-75% standing floodwater',
    unitKind: 'drainage_m',
    unitAmount: 20,
    unitAmountPerInstance: 4,
    unitCostNgn: 160_000,
    estimatedCostNgn: 800_000,
    householdsImpacted: 42,
    position: [0.1, -0.34, -3.05],
    modelScale: 0.72,
    modelStretch: [1.28, 0.62, 1.48],
    rotation: [0.16, -0.05, 0],
    instances: [
      { id: '0', label: 'Drain Slab 1 (Center · Tagged)', position: [0.1, -0.34, -3.05] },
      { id: '1', label: 'Drain Slab 2 (Mid-West)', position: [-1.1, -0.34, -3.11] },
      { id: '2', label: 'Drain Slab 3 (Far West)', position: [-2.3, -0.34, -3.17] },
      { id: '3', label: 'Drain Slab 4 (Mid-East)', position: [1.3, -0.34, -2.99] },
      { id: '4', label: 'Drain Slab 5 (Far East)', position: [2.5, -0.34, -2.93] },
    ],
    cameraPosition: [1.65, 1.55, -0.1],
    cameraTarget: [0.1, 0.08, -3.05],
    modelPath: '/models/drain_cover.glb',
    fallbackKind: 'drain',
    lux3dPrompt:
      'A modular precast concrete street drainage channel segment with removable slotted metal grate covers for narrow urban alleys in Lagos Nigeria, realistic 3D model, clean background',
    source: 'preset',
  },
  {
    id: 'pin-streetlight',
    title: 'Dark Market Footpath',
    locationLabel: 'Full Corridor · 3 Solar Poles',
    category: 'No Streetlight',
    severity: 'high',
    residentNote:
      '"Once it is 6:45 PM, the whole corridor goes pitch black. Traders pack early and elders trip over broken edges."',
    proposedFix:
      'Space off-grid solar LED poles along the visible corridor with outward-facing dual warm-white luminaires.',
    impactMetric: '+3.5 hrs safe evening trade',
    unitKind: 'solar_lamp',
    unitAmount: 3,
    unitAmountPerInstance: 1,
    unitCostNgn: 350_000,
    estimatedCostNgn: 1_050_000,
    householdsImpacted: 56,
    position: [-0.65, 0.14, -4.24],
    modelScale: 0.54,
    rotationY: Math.PI / 2,
    instances: [
      { id: '0', label: 'Solar Pole 1 (Center · Tagged)', position: [-0.65, 0.14, -4.24] },
      { id: '1', label: 'Solar Pole 2 (Far West)', position: [-2.85, 0.14, -4.34] },
      { id: '2', label: 'Solar Pole 3 (Far East)', position: [2.75, 0.14, -4.12] },
    ],
    cameraPosition: [1.4, 2.0, -0.4],
    cameraTarget: [-0.65, 1.35, -4.24],
    modelPath: '/models/solar_lamp.glb',
    fallbackKind: 'solar',
    lux3dPrompt:
      'An off-grid community solar LED streetlight pole with angled photovoltaic panel on top, weatherproof battery cabinet, and dual warm LED lamps, realistic 3D asset, clean background',
    source: 'preset',
  },
  {
    id: 'pin-waste',
    title: 'Blocked Culvert Corner',
    locationLabel: 'North Alley Entrance',
    category: 'Waste Overflow',
    severity: 'medium',
    residentNote:
      '"Without a raised collection bin, loose nylon and household waste wash straight into the gutter and choke the outflow."',
    proposedFix:
      'Place a raised, covered 3-bin community waste & recycling hub off the flood line for scheduled cart pickup.',
    impactMetric: '100% drain-mouth clearance',
    unitKind: 'waste_hub',
    unitAmount: 1,
    unitAmountPerInstance: 1,
    unitCostNgn: 290_000,
    estimatedCostNgn: 290_000,
    householdsImpacted: 25,
    position: [1.0, 0.22, -4.18],
    modelScale: 0.56,
    cameraPosition: [-0.1, 1.85, -0.5],
    cameraTarget: [1.0, 0.78, -4.18],
    modelPath: '/models/waste_hub.glb',
    fallbackKind: 'waste',
    lux3dPrompt:
      'A compact covered West African community waste sorting and recycling hub on a raised concrete plinth with three color-coded metal bins and corrugated shade roof, realistic 3D asset, clean background',
    source: 'preset',
  },
];

export function getPinInstances(pin: CommunityProblemPin): PropInstance[] {
  if (pin.instances && pin.instances.length > 0) {
    return pin.instances;
  }
  return [
    {
      id: '0',
      label: pin.title,
      position: pin.position,
      modelScale: pin.modelScale,
      modelStretch: pin.modelStretch,
      rotationY: pin.rotationY,
      rotation: pin.rotation,
    },
  ];
}

export function getInstanceOverrideKey(
  pinId: string,
  instanceId: string
): string {
  return instanceId === '0' ? pinId : `${pinId}#${instanceId}`;
}

export function parseInstanceOverrideKey(key: string): {
  pinId: string;
  instanceId: string;
} {
  const hashIdx = key.indexOf('#');
  if (hashIdx === -1) return { pinId: key, instanceId: '0' };
  return {
    pinId: key.slice(0, hashIdx),
    instanceId: key.slice(hashIdx + 1) || '0',
  };
}

export function getPinInstanceCount(pin: CommunityProblemPin): number {
  return getPinInstances(pin).length;
}

export function getPinComputedCost(pin: CommunityProblemPin): number {
  const count = getPinInstanceCount(pin);
  if (typeof pin.unitCostNgn === 'number') {
    return pin.unitCostNgn * count;
  }
  return pin.estimatedCostNgn;
}

export function getPinComputedUnitAmount(pin: CommunityProblemPin): number {
  const count = getPinInstanceCount(pin);
  if (typeof pin.unitAmountPerInstance === 'number') {
    return pin.unitAmountPerInstance * count;
  }
  return pin.unitAmount;
}

export function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function summarizeCivicImpact(
  pins: CommunityProblemPin[],
  activeHotspotIds: string[],
  viewMode: ViewMode
): CivicImpactSummary {
  const plannedPins = pins.filter((p) => activeHotspotIds.includes(p.id));
  const activePins = viewMode === 'upgrade' ? plannedPins : [];

  const counts = {
    drainageMeters: 0,
    solarLamps: 0,
    wasteHubs: 0,
    walkwayMeters: 0,
    customUnits: 0,
  };

  let totalCostNgn = 0;
  let householdsImpacted = 0;

  for (const pin of activePins) {
    const cost = getPinComputedCost(pin);
    const amount = getPinComputedUnitAmount(pin);
    totalCostNgn += cost;
    householdsImpacted += pin.householdsImpacted;
    if (pin.unitKind === 'drainage_m') counts.drainageMeters += amount;
    else if (pin.unitKind === 'solar_lamp') counts.solarLamps += amount;
    else if (pin.unitKind === 'waste_hub') counts.wasteHubs += amount;
    else if (pin.unitKind === 'walkway_m') counts.walkwayMeters += amount;
    else counts.customUnits += amount;
  }

  let plannedCostNgn = 0;
  let plannedHouseholdsImpacted = 0;
  for (const pin of plannedPins) {
    plannedCostNgn += getPinComputedCost(pin);
    plannedHouseholdsImpacted += pin.householdsImpacted;
  }

  return {
    activeCount: activePins.length,
    plannedCount: plannedPins.length,
    totalCostNgn,
    plannedCostNgn,
    householdsImpacted,
    plannedHouseholdsImpacted,
    counts,
    activePins,
    plannedPins,
  };
}
