export interface Lux3DProgressUpdate {
  stage: 'submitting' | 'polling' | 'complete' | 'fallback';
  message: string;
  elapsedMs: number;
  taskId?: string;
}

export interface Lux3DGenerationOptions {
  fallbackModelPath?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  signal?: AbortSignal;
  onProgress?: (update: Lux3DProgressUpdate) => void;
}

export interface Lux3DGenerationResult {
  modelUrl: string;
  rawGlbUrl?: string;
  source: 'aholo-lux3d' | 'local-fallback';
  taskId?: string;
  fallbackReason?: string;
}

const DEFAULT_FALLBACK_MODEL = '/models/drain_cover.glb';
const DEFAULT_TIMEOUT_MS = 75_000;
const DEFAULT_POLL_INTERVAL_MS = 2_500;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Generates a 3D upgrade .glb asset using Aholo Lux3D (G1-Turbo) via our
 * secure Next.js API routes (/api/lux3d/generate + /api/tasks/status),
 * with automatic fallback to pre-generated local .glb catalog assets if
 * offline, unconfigured, or timed out during a live demo.
 */
export async function generateLux3DAsset(
  prompt: string,
  options: Lux3DGenerationOptions = {}
): Promise<Lux3DGenerationResult> {
  const fallbackModelPath =
    options.fallbackModelPath ?? DEFAULT_FALLBACK_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startedAt = Date.now();

  const emit = (
    stage: Lux3DProgressUpdate['stage'],
    message: string,
    taskId?: string
  ) => {
    options.onProgress?.({
      stage,
      message,
      elapsedMs: Date.now() - startedAt,
      taskId,
    });
  };

  const fallbackWith = (reason: string, taskId?: string): Lux3DGenerationResult => {
    emit('fallback', reason, taskId);
    return {
      modelUrl: fallbackModelPath,
      source: 'local-fallback',
      taskId,
      fallbackReason: reason,
    };
  };

  if (!prompt.trim()) {
    return fallbackWith('Empty prompt — using instant catalog prop.');
  }

  try {
    emit('submitting', 'Sending prompt to Aholo Lux3D (G1-Turbo)…');

    const createRes = await fetch('/api/lux3d/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'text-to-3d',
        prompt: prompt.trim(),
        version: 'G1-Turbo',
        style: 'photorealistic',
        outputFormat: ['glb', 'zip'],
        enablePbr: true,
        aiPredictSize: true,
      }),
      signal: options.signal,
    });

    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !createData.taskId) {
      const reason =
        createData.error ||
        `Aholo API unavailable (${createRes.status}) — using catalog fallback.`;
      return fallbackWith(reason);
    }

    const taskId = String(createData.taskId);
    emit(
      'polling',
      `Generating 3D GLB mesh on Aholo (Task #${taskId})…`,
      taskId
    );

    while (Date.now() - startedAt < timeoutMs) {
      await sleep(pollIntervalMs, options.signal);

      const statusRes = await fetch(
        `/api/tasks/status?type=lux3d&id=${encodeURIComponent(taskId)}`,
        { signal: options.signal }
      );
      const statusData = await statusRes.json().catch(() => ({}));

      if (!statusRes.ok) {
        return fallbackWith(
          statusData.error || 'Task status check failed — using catalog fallback.',
          taskId
        );
      }

      if (statusData.status === 'succeeded') {
        const rawGlbUrl: string | undefined = statusData.lux3d?.glbUrl;
        if (!rawGlbUrl) {
          return fallbackWith(
            'Lux3D completed without a GLB URL — using catalog fallback.',
            taskId
          );
        }

        const proxiedUrl = `/api/lux3d/model?url=${encodeURIComponent(
          rawGlbUrl
        )}`;
        emit('complete', 'Lux3D asset ready — placing on street!', taskId);

        return {
          modelUrl: proxiedUrl,
          rawGlbUrl,
          source: 'aholo-lux3d',
          taskId,
        };
      }

      if (
        statusData.status === 'failed' ||
        statusData.status === 'canceled'
      ) {
        return fallbackWith(
          statusData.error ||
            `Lux3D task ${statusData.status} — using catalog fallback.`,
          taskId
        );
      }

      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      emit(
        'polling',
        `Building 3D mesh with Lux3D G1-Turbo (${elapsedSec}s)…`,
        taskId
      );
    }

    return fallbackWith(
      'Lux3D generation timed out — placed local catalog fallback.',
      taskId
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return fallbackWith('Switched to instant catalog asset.');
    }
    return fallbackWith(
      err instanceof Error
        ? `${err.message} — using local catalog fallback.`
        : 'Network offline — using local catalog fallback.'
    );
  }
}
