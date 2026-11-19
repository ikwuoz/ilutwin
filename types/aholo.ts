export type AholoRegion = 'com' | 'cn';

export type Lux3dVersion = 'G1-Turbo' | 'G1';

export type Lux3dStyle =
  | 'photorealistic'
  | 'cartoon'
  | 'anime'
  | 'hand_painted'
  | 'cyberpunk'
  | 'fantasy'
  | 'glass';

export type Lux3dOutputFormat = 'zip' | 'glb' | 'ply';

export type WorldTaskQuality = 'low' | 'normal' | 'high';

export type WorldSceneType = 'space' | 'model';

export type WorldResourceType = 'image' | 'video' | 'insv';

export interface UploadedMediaFile {
  filename: string;
  url: string;
  md5: string;
  uploadKey?: string;
  obsTaskId?: string;
  mediaType: 'image' | 'video' | 'insv';
  sizeBytes: number;
}

export interface Lux3dGeneratePayload {
  mode: 'text-to-3d' | 'img-to-3d';
  prompt?: string;
  img?: string;
  imgs?: string[];
  version?: Lux3dVersion;
  style?: Lux3dStyle;
  outputFormat?: Lux3dOutputFormat[];
  enablePbr?: boolean;
  aiPredictSize?: boolean;
}

export interface WorldReconstructResource {
  url: string;
  type: WorldResourceType;
}

export interface WorldReconstructPayload {
  name?: string;
  mode?: 'reconstruct' | 'generate';
  resources?: WorldReconstructResource[];
  prompt?: string;
  taskQuality?: WorldTaskQuality;
  scene?: WorldSceneType;
  useMask?: boolean;
}

export type NormalizedTaskStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface Lux3dOutputs {
  glbUrl?: string;
  zipUrl?: string;
  plyUrl?: string;
  rawUrls: string[];
}

export interface WorldOutputs {
  plyPath?: string;
  spzPath?: string;
  lodMetaPath?: string;
  panoUrl?: string;
  upAxis?: 'Y' | 'Z';
}

export interface TaskStatusResponse {
  type: 'lux3d' | 'world';
  id: string;
  status: NormalizedTaskStatus;
  rawStatus: string | number;
  progress?: number;
  lux3d?: Lux3dOutputs;
  world?: WorldOutputs;
  error?: string;
}
