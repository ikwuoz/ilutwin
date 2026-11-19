import {
  createLux3dClient,
  LUX3D_STATUS_CANCELED,
  LUX3D_STATUS_FAILED,
  LUX3D_STATUS_SUCCESS,
} from '@manycore/aholo-sdk-lux3d';
import type {
  Lux3dGeneratePayload,
  Lux3dOutputs,
  NormalizedTaskStatus,
  TaskStatusResponse,
} from '@/types/aholo';
import { getLux3dConfig } from './config';

/**
 * Starts an asynchronous Lux3D generation task (text-to-3D or img-to-3D).
 * Defaults to G1-Turbo and requests GLB + ZIP outputs for fast hackathon previews.
 */
export async function startLux3dGeneration(
  payload: Lux3dGeneratePayload
): Promise<{ taskId: number }> {
  const client = createLux3dClient(getLux3dConfig());
  const version = payload.version ?? 'G1-Turbo';
  const outputFormat = payload.outputFormat ?? ['glb', 'zip'];
  const enablePbr = payload.enablePbr ?? true;
  const aiPredictSize = payload.aiPredictSize ?? true;

  if (payload.mode === 'text-to-3d') {
    if (!payload.prompt?.trim()) {
      throw new Error('A text prompt is required for text-to-3d generation.');
    }

    const taskId = await client.textTo3d.create({
      prompt: payload.prompt.trim(),
      style: payload.style ?? 'photorealistic',
      ...(payload.img ? { img: payload.img } : {}),
      version,
      outputFormat,
      enablePbr,
      aiPredictSize,
    });

    return { taskId };
  }

  // img-to-3d mode
  if (payload.imgs && payload.imgs.length > 0) {
    const taskId = await client.imgTo3d.create({
      imgs: payload.imgs,
      version,
      outputFormat,
      enablePbr,
      aiPredictSize,
    });
    return { taskId };
  }

  if (!payload.img?.trim()) {
    throw new Error('An image URL or data URL is required for img-to-3d generation.');
  }

  const taskId = await client.imgTo3d.create({
    img: payload.img.trim(),
    version,
    outputFormat,
    enablePbr,
    aiPredictSize,
  });

  return { taskId };
}

function parseLux3dOutputs(
  outputs: Array<{ content?: string | null }>
): Lux3dOutputs {
  const rawUrls = outputs
    .map((item) => item.content)
    .filter(
      (content): content is string =>
        typeof content === 'string' &&
        content.startsWith('http') &&
        content !== 'NOT_REQUESTED'
    );

  const glbUrl = rawUrls.find((u) => /\.glb(\?|$)/i.test(u));
  const zipUrl = rawUrls.find((u) => /\.zip(\?|$)/i.test(u));
  const plyUrl = rawUrls.find((u) => /\.ply(\?|$)/i.test(u));

  return {
    glbUrl,
    zipUrl,
    plyUrl,
    rawUrls,
  };
}

/**
 * Fetches current Lux3D task status and extracts generated GLB/ZIP/PLY URLs.
 */
export async function getLux3dTaskStatus(
  taskId: string | number
): Promise<TaskStatusResponse> {
  const client = createLux3dClient(getLux3dConfig());
  const result = await client.tasks.retrieve(taskId);

  let status: NormalizedTaskStatus = 'processing';
  if (result.status === 0) {
    status = 'pending';
  } else if (result.status === LUX3D_STATUS_SUCCESS) {
    status = 'succeeded';
  } else if (result.status === LUX3D_STATUS_FAILED) {
    status = 'failed';
  } else if (result.status === LUX3D_STATUS_CANCELED) {
    status = 'canceled';
  }

  return {
    type: 'lux3d',
    id: String(result.taskId),
    status,
    rawStatus: result.status,
    lux3d: parseLux3dOutputs(result.outputs ?? []),
    ...(status === 'failed'
      ? { error: 'Lux3D generation task failed on Aholo servers.' }
      : {}),
  };
}
