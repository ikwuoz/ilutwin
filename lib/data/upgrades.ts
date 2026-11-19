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

export interface TransformOverride {
  position: [number, number, number];
  modelScale: number;
  rotationY?: number;
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
  householdsImpacted: number;
  /** Pin & Lux3D prop coordinates [x, y, z] in the 3D street scene */
  position: [number, number, number];
  /** Uniform scale for the Lux3D .glb prop */
  modelScale: number;
  /** Optional local axis stretch multipliers [sx, sy, sz] */
  modelStretch?: [number, number, number];
  /** Optional Y-axis yaw rotation in radians */
  rotationY?: number;
  /** Optional Euler rotation [rx, ry, rz] in radians */
  rotation?: [number, number, number];
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
    target: [-1.7, 1.35, -4.2],
    pinId: 'pin-streetlight',
  },
  {
    id: 'waste',
    label: 'Waste Hub',
    shortcut: '4',
    position: [-0.1, 1.85, -0.5],
    target: [1.75, 0.78, -4.05],
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
      'Install modular precast concrete drainage channels with removable slotted steel covers along the street edge.',
    impactMetric: '-75% standing floodwater',
    unitKind: 'drainage_m',
    unitAmount: 15,
    estimatedCostNgn: 480_000,
    householdsImpacted: 32,
    position: [0.1, -0.32, -2.7],
    modelScale: 0.75,
    modelStretch: [1.55, 0.7, 1.08],
    rotation: [0.02, Math.PI / 2 - 0.06, 0.04],
    cameraPosition: [1.65, 1.55, -0.1],
    cameraTarget: [-0.05, 0.12, -2.7],
    modelPath: '/models/drain_cover.glb',
    fallbackKind: 'drain',
    lux3dPrompt:
      'A modular precast concrete street drainage channel segment with removable slotted metal grate covers for narrow urban alleys in Lagos Nigeria, realistic 3D model, clean background',
    source: 'preset',
  },
  {
    id: 'pin-streetlight',
    title: 'Dark Market Footpath',
    locationLabel: 'Mid-Street Walk · Pole 2',
    category: 'No Streetlight',
    severity: 'high',
    residentNote:
      '"Once it is 6:45 PM, the whole corridor goes pitch black. Traders pack early and elders trip over broken edges."',
    proposedFix:
      'Mount an off-grid solar LED pole with elevated lithium battery enclosure and wide warm-white beam.',
    impactMetric: '+3.5 hrs safe evening trade',
    unitKind: 'solar_lamp',
    unitAmount: 1,
    estimatedCostNgn: 350_000,
    householdsImpacted: 28,
    position: [-1.5, 0, -4.2],
    modelScale: 0.55,
    rotationY: Math.PI / 2,
    cameraPosition: [1.4, 2.0, -0.4],
    cameraTarget: [-1.7, 1.35, -4.2],
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
    estimatedCostNgn: 290_000,
    householdsImpacted: 25,
    position: [1.85, 0.22, -4.05],
    modelScale: 0.64,
    cameraPosition: [-0.1, 1.85, -0.5],
    cameraTarget: [1.75, 0.78, -4.05],
    modelPath: '/models/waste_hub.glb',
    fallbackKind: 'waste',
    lux3dPrompt:
      'A compact covered West African community waste sorting and recycling hub on a raised concrete plinth with three color-coded metal bins and corrugated shade roof, realistic 3D asset, clean background',
    source: 'preset',
  },
];

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
    totalCostNgn += pin.estimatedCostNgn;
    householdsImpacted += pin.householdsImpacted;
    if (pin.unitKind === 'drainage_m') counts.drainageMeters += pin.unitAmount;
    else if (pin.unitKind === 'solar_lamp') counts.solarLamps += pin.unitAmount;
    else if (pin.unitKind === 'waste_hub') counts.wasteHubs += pin.unitAmount;
    else if (pin.unitKind === 'walkway_m') counts.walkwayMeters += pin.unitAmount;
    else counts.customUnits += pin.unitAmount;
  }

  let plannedCostNgn = 0;
  let plannedHouseholdsImpacted = 0;
  for (const pin of plannedPins) {
    plannedCostNgn += pin.estimatedCostNgn;
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
