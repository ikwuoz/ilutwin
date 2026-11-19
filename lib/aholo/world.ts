import {
  createWorldClient,
  WORLD_TERMINAL_FAILURE_STATUSES,
} from '@manycore/aholo-sdk-world';
import type {
  NormalizedTaskStatus,
  TaskStatusResponse,
  WorldReconstructPayload,
} from '@/types/aholo';
import { getAholoConfig } from './config';

/**
 * Starts an asynchronous Aholo World 3DGS job.
 * - `reconstruct`: requires 1+ video/insv OR at least 20 images.
 * - `generate`: Spatial Gen from a single photo and/or text prompt.
 */
export async function startWorldTask(
  payload: WorldReconstructPayload
): Promise<{ worldId: string }> {
  const client = createWorldClient(getAholoConfig());
  const mode = payload.mode ?? 'reconstruct';
  const name = payload.name?.trim() || 'IluTwin Lagos Street';

  if (mode === 'generate') {
    const firstImage = payload.resources?.find((r) => r.type === 'image');
    if (!payload.prompt?.trim() && !firstImage) {
      throw new Error(
        'Provide a prompt or an image to generate a 3DGS world.'
      );
    }

    const op = await client.generations.create({
      name,
      ...(payload.prompt?.trim() ? { prompt: payload.prompt.trim() } : {}),
      ...(firstImage
        ? { resources: [{ url: firstImage.url, type: 'image' }] }
        : {}),
    });

    return { worldId: op.worldId };
  }

  // Reconstruction mode
  const resources = payload.resources ?? [];
  if (resources.length === 0) {
    throw new Error(
      'At least one video (.mp4/.mov) or 20+ photos are required for 3DGS reconstruction.'
    );
  }

  const imageCount = resources.filter((r) => r.type === 'image').length;
  if (imageCount > 0 && imageCount < 20) {
    throw new Error(
      `Aholo 3DGS photo reconstruction requires at least 20 photos (received ${imageCount}). Upload a short walkthrough video (.mp4/.mov) or switch to Quick AI Scene for single-photo generation.`
    );
  }

  const op = await client.reconstructions.create({
    name,
    resources,
    taskQuality: payload.taskQuality ?? 'low',
    scene: payload.scene ?? 'space',
    useMask: payload.useMask ?? false,
  });

  return { worldId: op.worldId };
}

/**
 * Retrieves current status, progress, and 3DGS splat URLs for a World task.
 */
export async function getWorldTaskStatus(
  worldId: string
): Promise<TaskStatusResponse> {
  const client = createWorldClient(getAholoConfig());
  const detail = await client.retrieve(worldId);

  const rawStatus = detail.status ?? 'PENDING';
  let status: NormalizedTaskStatus = 'processing';

  if (rawStatus === 'PENDING') {
    status = 'pending';
  } else if (rawStatus === 'SUCCEEDED') {
    status = 'succeeded';
  } else if (rawStatus === 'CANCELED') {
    status = 'canceled';
  } else if (WORLD_TERMINAL_FAILURE_STATUSES.includes(rawStatus)) {
    status = 'failed';
  }

  return {
    type: 'world',
    id: detail.worldId,
    status,
    rawStatus,
    progress: detail.progress,
    world: {
      plyPath: detail.assets?.splats?.urls?.plyPath,
      spzPath: detail.assets?.splats?.urls?.spzPath,
      lodMetaPath: detail.assets?.splats?.urls?.lodMetaPath,
      panoUrl: detail.assets?.imagery?.panoUrl,
      upAxis: detail.assets?.semanticsMetadata?.upAxis,
    },
    ...(status === 'failed'
      ? { error: `World reconstruction ended with status: ${rawStatus}.` }
      : {}),
  };
}
