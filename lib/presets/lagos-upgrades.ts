import type { LagosAssetPreset } from '@/types/ilutwin';

export const LAGOS_ASSET_PRESETS: LagosAssetPreset[] = [
  {
    id: 'stilt-home',
    title: 'Elevated Coastal Stilt House',
    category: 'housing',
    summary: 'Compact flood-safe timber & corrugated-roof dwelling on raised piers.',
    prompt:
      'A practical elevated West African stilt house for Lagos lagoon communities, raised 1 meter on sturdy concrete and hardwood piers, corrugated metal gable roof with rainwater gutter, ventilated timber walls, small front veranda with wooden steps, realistic architectural 3D model, clean background',
    estimatedImpact: 'Protects family belongings from 0.9m flood surges',
  },
  {
    id: 'drainage-channel',
    title: 'Covered Storm Drainage Channel',
    category: 'drainage',
    summary: 'Modular precast concrete gutter with removable slotted grate.',
    prompt:
      'A modular precast concrete street drainage channel segment with removable slotted metal grate covers, designed for narrow urban alleys in Lagos Nigeria, realistic urban infrastructure 3D asset, clean background',
    estimatedImpact: 'Reduces standing floodwater and mosquito breeding',
  },
  {
    id: 'raised-walkway',
    title: 'Raised Pedestrian Boardwalk',
    category: 'mobility',
    summary: 'All-weather elevated timber and galvanized steel footbridge module.',
    prompt:
      'A durable raised pedestrian walkway bridge segment made of treated hardwood planks on galvanized steel support posts with simple side safety handrails, West African urban community upgrade, realistic 3D architectural model, clean background',
    estimatedImpact: 'Keeps school & market paths passable year-round',
  },
  {
    id: 'solar-streetlight',
    title: 'Off-Grid Solar Streetlight Pole',
    category: 'energy',
    summary: 'Tall galvanized pole with rooftop solar panel, battery box & LED lamp.',
    prompt:
      'An off-grid community solar LED streetlight pole with angled photovoltaic panel on top, weatherproof battery cabinet, and dual warm LED street lamps, realistic urban infrastructure 3D asset, clean background',
    estimatedImpact: 'Extends safe evening trade and walking visibility',
  },
  {
    id: 'water-kiosk',
    title: 'Community Solar Water Kiosk',
    category: 'civic',
    summary: 'Shaded clean-water tap station with overhead storage tank & solar roof.',
    prompt:
      'A compact Nigerian community clean water kiosk with elevated black polyethylene water tank on steel frame, corrugated solar-panel shade canopy, concrete tap stand with three faucets, realistic 3D architectural asset, clean background',
    estimatedImpact: 'Serves 150+ households with clean filtered water',
  },
];
