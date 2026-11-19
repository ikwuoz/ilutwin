export interface LagosAssetPreset {
  id: string;
  title: string;
  category: 'housing' | 'drainage' | 'mobility' | 'energy' | 'civic';
  summary: string;
  prompt: string;
  estimatedImpact: string;
}
