'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Box,
  CheckCircle2,
  ExternalLink,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { LAGOS_ASSET_PRESETS } from '@/lib/presets/lagos-upgrades';
import type {
  Lux3dVersion,
  TaskStatusResponse,
  UploadedMediaFile,
  WorldTaskQuality,
} from '@/types/aholo';

export function UploadPipeline() {
  const [aholoConfigured, setAholoConfigured] = useState<boolean | null>(null);

  // World reconstruction state
  const [streetName, setStreetName] = useState('Lagos Residential Street');
  const [worldMode, setWorldMode] = useState<'reconstruct' | 'generate'>(
    'reconstruct'
  );
  const [taskQuality, setTaskQuality] = useState<WorldTaskQuality>('low');
  const [worldFiles, setWorldFiles] = useState<File[]>([]);
  const [uploadedWorldMedia, setUploadedWorldMedia] = useState<
    UploadedMediaFile[]
  >([]);
  const [worldUploading, setWorldUploading] = useState(false);
  const [worldTask, setWorldTask] = useState<TaskStatusResponse | null>(null);
  const [worldError, setWorldError] = useState<string | null>(null);

  // Lux3D upgrade asset state
  const [luxMode, setLuxMode] = useState<'text-to-3d' | 'img-to-3d'>(
    'text-to-3d'
  );
  const [luxVersion, setLuxVersion] = useState<Lux3dVersion>('G1-Turbo');
  const [selectedPresetId, setSelectedPresetId] = useState(
    LAGOS_ASSET_PRESETS[0].id
  );
  const [luxPrompt, setLuxPrompt] = useState(LAGOS_ASSET_PRESETS[0].prompt);
  const [luxImageFile, setLuxImageFile] = useState<File | null>(null);
  const [luxSubmitting, setLuxSubmitting] = useState(false);
  const [luxTask, setLuxTask] = useState<TaskStatusResponse | null>(null);
  const [luxError, setLuxError] = useState<string | null>(null);

  const worldPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const luxPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setAholoConfigured(Boolean(data.aholoConfigured)))
      .catch(() => setAholoConfigured(null));

    return () => {
      if (worldPollRef.current) clearInterval(worldPollRef.current);
      if (luxPollRef.current) clearInterval(luxPollRef.current);
    };
  }, []);

  const stopWorldPolling = () => {
    if (worldPollRef.current) {
      clearInterval(worldPollRef.current);
      worldPollRef.current = null;
    }
  };

  const stopLuxPolling = () => {
    if (luxPollRef.current) {
      clearInterval(luxPollRef.current);
      luxPollRef.current = null;
    }
  };

  const pollTask = (
    type: 'world' | 'lux3d',
    id: string,
    onUpdate: (data: TaskStatusResponse) => void,
    onErr: (msg: string) => void
  ) => {
    const intervalMs = type === 'world' ? 4000 : 3000;
    const stop = type === 'world' ? stopWorldPolling : stopLuxPolling;
    stop();

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/tasks/status?type=${type}&id=${encodeURIComponent(id)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          onErr(data.error || `Failed to poll task status (${res.status}).`);
          stop();
          return;
        }
        onUpdate(data as TaskStatusResponse);
        if (
          data.status === 'succeeded' ||
          data.status === 'failed' ||
          data.status === 'canceled'
        ) {
          stop();
        }
      } catch {
        onErr('Network error while checking Aholo task status.');
        stop();
      }
    };

    tick();
    const handle = setInterval(tick, intervalMs);
    if (type === 'world') {
      worldPollRef.current = handle;
    } else {
      luxPollRef.current = handle;
    }
  };

  const uploadFilesToAholo = async (
    files: File[]
  ): Promise<UploadedMediaFile[]> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Upload failed (${res.status}).`);
    }
    return (data.files ?? []) as UploadedMediaFile[];
  };

  const handleWorldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorldError(null);

    if (worldFiles.length === 0) {
      setWorldError(
        'Please choose a street video (.mp4 / .mov) or street photos first.'
      );
      return;
    }

    const imageFiles = worldFiles.filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f.name)
    );
    if (
      worldMode === 'reconstruct' &&
      imageFiles.length > 0 &&
      imageFiles.length < 20
    ) {
      setWorldError(
        `Photo reconstruction requires at least 20 photos (selected ${imageFiles.length}). Upload a short walkthrough video (.mp4/.mov) or switch to "Quick AI Scene" for 1 photo.`
      );
      return;
    }

    try {
      setWorldUploading(true);
      const uploaded = await uploadFilesToAholo(worldFiles);
      setUploadedWorldMedia(uploaded);

      const res = await fetch('/api/world/reconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: streetName,
          mode: worldMode,
          taskQuality,
          scene: 'space',
          resources: uploaded.map((u) => ({
            url: u.url,
            type: u.mediaType,
          })),
          ...(worldMode === 'generate'
            ? {
                prompt: `Lagos informal settlement street ${streetName}, sunlit outdoor community alley`,
              }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || `Could not start Aholo World task (${res.status}).`
        );
      }

      setWorldTask({
        type: 'world',
        id: data.worldId,
        status: 'pending',
        rawStatus: 'PENDING',
      });

      pollTask(
        'world',
        data.worldId,
        (statusData) => setWorldTask(statusData),
        (msg) => setWorldError(msg)
      );
    } catch (err) {
      setWorldError(
        err instanceof Error ? err.message : 'Unexpected upload error.'
      );
    } finally {
      setWorldUploading(false);
    }
  };

  const handleLuxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLuxError(null);

    try {
      setLuxSubmitting(true);
      let imageUrl: string | undefined;

      if (luxMode === 'img-to-3d') {
        if (!luxImageFile) {
          throw new Error('Please upload a reference photo for Image-to-3D.');
        }
        const uploaded = await uploadFilesToAholo([luxImageFile]);
        imageUrl = uploaded[0]?.url;
      }

      const res = await fetch('/api/lux3d/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: luxMode,
          version: luxVersion,
          ...(luxMode === 'text-to-3d'
            ? { prompt: luxPrompt, style: 'photorealistic' }
            : { img: imageUrl }),
          outputFormat: ['glb', 'zip'],
          enablePbr: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || `Could not start Lux3D generation (${res.status}).`
        );
      }

      setLuxTask({
        type: 'lux3d',
        id: String(data.taskId),
        status: 'pending',
        rawStatus: 0,
      });

      pollTask(
        'lux3d',
        String(data.taskId),
        (statusData) => setLuxTask(statusData),
        (msg) => setLuxError(msg)
      );
    } catch (err) {
      setLuxError(
        err instanceof Error ? err.message : 'Unexpected Lux3D error.'
      );
    } finally {
      setLuxSubmitting(false);
    }
  };

  const handlePresetPick = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = LAGOS_ASSET_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setLuxPrompt(preset.prompt);
    }
  };

  const exploreHref = (() => {
    const params = new URLSearchParams();
    if (luxTask?.lux3d?.glbUrl) {
      const glb = luxTask.lux3d.glbUrl;
      params.set(
        'glb',
        glb.startsWith('https://')
          ? `/api/lux3d/model?url=${encodeURIComponent(glb)}`
          : glb
      );
    }
    if (worldTask?.world?.spzPath || worldTask?.world?.plyPath) {
      params.set(
        'splat',
        worldTask.world.spzPath || worldTask.world.plyPath || ''
      );
      params.set('worldId', worldTask.id);
    }
    const qs = params.toString();
    return qs ? `/explore?${qs}` : '/explore';
  })();

  return (
    <div className="space-y-6">
      {aholoConfigured === false && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#D9822B]/35 bg-white p-4 text-sm text-[#111312]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D9822B]" />
          <div>
            <p className="text-xs font-bold">
              AHOLO_API_KEY is not set in{' '}
              <code className="tabular-mono">.env.local</code>
            </p>
            <p className="mt-0.5 text-xs text-[#4A504C]">
              Copy <code className="tabular-mono">.env.local.example</code> to{' '}
              <code className="tabular-mono">.env.local</code> with your Aholo
              API key to run live 3DGS reconstructions and Lux3D generations.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel 1: Aholo World Reconstruction */}
        <section className="rounded-2xl border border-[var(--hud-border-subtle)] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="tabular-mono inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#4A504C]">
              <span className="h-2 w-2 rounded-full bg-[#0EA5E9]" />
              01 · Aholo World (3DGS)
            </span>
            <span className="rounded-full border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2.5 py-0.5 text-[10px] font-semibold text-[#4A504C]">
              Street Scan
            </span>
          </div>

          <h2 className="mt-3 text-lg font-bold tracking-tight text-[#111312]">
            Reconstruct Street or Compound
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#4A504C]">
            Upload a walkthrough video (
            <code className="tabular-mono">.mp4</code> /{' '}
            <code className="tabular-mono">.mov</code>) or 20+ overlapping
            phone photos to build a 3D Gaussian Splat twin.
          </p>

          <form onSubmit={handleWorldSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6E7570]">
                Community / Street Name
              </label>
              <input
                type="text"
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                placeholder="e.g. Surulere Drain Corridor"
                className="mt-1.5 w-full rounded-xl border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-3.5 py-2.5 text-sm text-[#111312] transition focus:border-[#111312] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--hud-border-subtle)] bg-[#EEEDE9] p-1">
              <button
                type="button"
                onClick={() => setWorldMode('reconstruct')}
                className={`hud-transition rounded-full px-3 py-2 text-center text-xs font-bold active:scale-[0.98] ${
                  worldMode === 'reconstruct'
                    ? 'bg-[#111312] text-white shadow-xs'
                    : 'text-[#4A504C] hover:text-[#111312]'
                }`}
              >
                3DGS Video / 20+ Photos
              </button>
              <button
                type="button"
                onClick={() => setWorldMode('generate')}
                className={`hud-transition rounded-full px-3 py-2 text-center text-xs font-bold active:scale-[0.98] ${
                  worldMode === 'generate'
                    ? 'bg-[#111312] text-white shadow-xs'
                    : 'text-[#4A504C] hover:text-[#111312]'
                }`}
              >
                Quick AI Scene (1 Photo)
              </button>
            </div>

            {worldMode === 'reconstruct' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6E7570]">
                  Reconstruction Quality
                </label>
                <select
                  value={taskQuality}
                  onChange={(e) =>
                    setTaskQuality(e.target.value as WorldTaskQuality)
                  }
                  className="mt-1.5 w-full rounded-xl border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-3.5 py-2.5 text-sm text-[#111312] transition focus:border-[#111312] focus:bg-white focus:outline-none"
                >
                  <option value="low">Low — Fast Preview (Hackathon)</option>
                  <option value="normal">Normal — Balanced Detail</option>
                  <option value="high">High — Detailed Survey</option>
                </select>
              </div>
            )}

            <label className="hud-transition flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--hud-border-light)] bg-[#F2F2EF]/75 px-4 py-6 text-center hover:border-[#111312] hover:bg-[#F2F2EF]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-xs">
                <FileVideo className="h-5 w-5 text-[#111312]" />
              </div>
              <span className="mt-2.5 text-xs font-bold text-[#111312]">
                {worldFiles.length > 0
                  ? `${worldFiles.length} file(s) selected`
                  : 'Choose street video or photos'}
              </span>
              <span className="tabular-mono mt-1 text-[11px] text-[#6E7570]">
                .mp4 .mov .insv .jpg .png .webp · max 150 MB
              </span>
              <input
                type="file"
                multiple
                accept=".mp4,.mov,.insv,.jpg,.jpeg,.png,.webp,video/*,image/*"
                onChange={(e) =>
                  setWorldFiles(Array.from(e.target.files ?? []))
                }
                className="sr-only"
              />
            </label>

            {worldError && (
              <div className="rounded-xl border border-[#E1262D]/25 bg-[#E1262D]/5 px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
                {worldError}
              </div>
            )}

            <button
              type="submit"
              disabled={worldUploading}
              className="hud-transition inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111312] px-5 py-3 text-xs font-bold text-white hover:bg-[#1B6E2D] active:scale-[0.98] disabled:opacity-60"
            >
              {worldUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading &amp; Starting 3DGS…
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 text-[#10B954]" />
                  Upload &amp; Reconstruct Street
                </>
              )}
            </button>
          </form>

          {uploadedWorldMedia.length > 0 && (
            <div className="tabular-mono mt-4 rounded-xl border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-3 py-2 text-[11px] text-[#4A504C]">
              Uploaded {uploadedWorldMedia.length} file(s) to Aholo OUS.
            </div>
          )}

          {worldTask && (
            <div className="mt-4 rounded-xl border border-[var(--hud-border-subtle)] bg-[#F2F2EF] p-3.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="tabular-mono font-bold text-[#111312]">
                  WORLD · {worldTask.id}
                </span>
                <span className="tabular-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--hud-border-subtle)] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#111312]">
                  {worldTask.status === 'succeeded' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B954]" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D9822B]" />
                  )}
                  {String(worldTask.rawStatus)}
                  {typeof worldTask.progress === 'number'
                    ? ` (${Math.round(worldTask.progress * 100)}%)`
                    : ''}
                </span>
              </div>

              {worldTask.status === 'succeeded' && (
                <div className="mt-2.5 space-y-1.5">
                  {worldTask.world?.spzPath && (
                    <a
                      href={worldTask.world.spzPath}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-[var(--hud-border-subtle)] bg-white px-3 py-2 text-xs font-semibold text-[#1B6E2D] hover:border-[#111312]"
                    >
                      <span>SPZ 3DGS Splat Ready</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {worldTask.world?.plyPath && (
                    <a
                      href={worldTask.world.plyPath}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-[var(--hud-border-subtle)] bg-white px-3 py-2 text-xs font-semibold text-[#111312] hover:border-[#111312]"
                    >
                      <span>PLY Point/Splat File</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Panel 2: Aholo Lux3D Upgrade Asset Generator */}
        <section className="rounded-2xl border border-[var(--hud-border-subtle)] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="tabular-mono inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#4A504C]">
              <span className="h-2 w-2 rounded-full bg-[#10B954]" />
              02 · Aholo Lux3D ({luxVersion})
            </span>
            <span className="rounded-full border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-2.5 py-0.5 text-[10px] font-semibold text-[#4A504C]">
              GLB Assets
            </span>
          </div>

          <h2 className="mt-3 text-lg font-bold tracking-tight text-[#111312]">
            Generate Practical 3D Upgrade Assets
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#4A504C]">
            Build stilt homes, lined storm drains, solar LED poles, or raised
            walkways from Lagos presets, custom prompts, or reference photos.
          </p>

          <form onSubmit={handleLuxSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--hud-border-subtle)] bg-[#EEEDE9] p-1">
              <button
                type="button"
                onClick={() => setLuxMode('text-to-3d')}
                className={`hud-transition rounded-full px-3 py-2 text-center text-xs font-bold active:scale-[0.98] ${
                  luxMode === 'text-to-3d'
                    ? 'bg-[#111312] text-white shadow-xs'
                    : 'text-[#4A504C] hover:text-[#111312]'
                }`}
              >
                Text-to-3D
              </button>
              <button
                type="button"
                onClick={() => setLuxMode('img-to-3d')}
                className={`hud-transition rounded-full px-3 py-2 text-center text-xs font-bold active:scale-[0.98] ${
                  luxMode === 'img-to-3d'
                    ? 'bg-[#111312] text-white shadow-xs'
                    : 'text-[#4A504C] hover:text-[#111312]'
                }`}
              >
                Image-to-3D
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6E7570]">
                Lux3D Model Version
              </label>
              <select
                value={luxVersion}
                onChange={(e) => setLuxVersion(e.target.value as Lux3dVersion)}
                className="mt-1.5 w-full rounded-xl border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-3.5 py-2.5 text-sm text-[#111312] transition focus:border-[#111312] focus:bg-white focus:outline-none"
              >
                <option value="G1-Turbo">
                  G1-Turbo — Fast Generation (Recommended)
                </option>
                <option value="G1">G1 — High Precision Mesh</option>
              </select>
            </div>

            {luxMode === 'text-to-3d' ? (
              <>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6E7570]">
                    Lagos Upgrade Presets
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {LAGOS_ASSET_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetPick(preset.id)}
                        className={`hud-transition rounded-full border px-3 py-1 text-xs font-semibold active:scale-[0.97] ${
                          selectedPresetId === preset.id
                            ? 'border-[#111312] bg-[#111312] text-white'
                            : 'border-[var(--hud-border-subtle)] bg-[#F2F2EF] text-[#4A504C] hover:bg-[#EAE9E4] hover:text-[#111312]'
                        }`}
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6E7570]">
                    Asset Description Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={luxPrompt}
                    onChange={(e) => setLuxPrompt(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[var(--hud-border-subtle)] bg-[#F2F2EF] px-3.5 py-2.5 text-xs leading-relaxed text-[#111312] transition focus:border-[#111312] focus:bg-white focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <label className="hud-transition flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--hud-border-light)] bg-[#F2F2EF]/75 px-4 py-6 text-center hover:border-[#111312] hover:bg-[#F2F2EF]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-xs">
                  <ImageIcon className="h-5 w-5 text-[#111312]" />
                </div>
                <span className="mt-2.5 text-xs font-bold text-[#111312]">
                  {luxImageFile
                    ? luxImageFile.name
                    : 'Choose reference photo or sketch'}
                </span>
                <span className="tabular-mono mt-1 text-[11px] text-[#6E7570]">
                  .jpg .jpeg .png .webp
                </span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/*"
                  onChange={(e) => setLuxImageFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
            )}

            {luxError && (
              <div className="rounded-xl border border-[#E1262D]/25 bg-[#E1262D]/5 px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
                {luxError}
              </div>
            )}

            <button
              type="submit"
              disabled={luxSubmitting}
              className="hud-transition inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#111312] bg-[#10B954] px-5 py-3 text-xs font-bold text-[#111312] hover:bg-[#0EA349] active:scale-[0.98] disabled:opacity-60"
            >
              {luxSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting Lux3D ({luxVersion})…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate 3D Upgrade Asset
                </>
              )}
            </button>
          </form>

          {luxTask && (
            <div className="mt-4 rounded-xl border border-[var(--hud-border-subtle)] bg-[#F2F2EF] p-3.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="tabular-mono font-bold text-[#111312]">
                  LUX3D · #{luxTask.id}
                </span>
                <span className="tabular-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--hud-border-subtle)] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#111312]">
                  {luxTask.status === 'succeeded' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B954]" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D9822B]" />
                  )}
                  {luxTask.status.toUpperCase()}
                </span>
              </div>

              {luxTask.status === 'succeeded' && (
                <div className="mt-2.5 space-y-1.5">
                  {luxTask.lux3d?.glbUrl && (
                    <a
                      href={luxTask.lux3d.glbUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-[var(--hud-border-subtle)] bg-white px-3 py-2 text-xs font-semibold text-[#1B6E2D] hover:border-[#111312]"
                    >
                      <span>Download GLB Model</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {luxTask.lux3d?.zipUrl && (
                    <a
                      href={luxTask.lux3d.zipUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-[var(--hud-border-subtle)] bg-white px-3 py-2 text-xs font-semibold text-[#111312] hover:border-[#111312]"
                    >
                      <span>Download Textured ZIP Bundle</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Obsidian Handoff to 3D Explorer (Nothing-inspired) */}
      <div
        className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[var(--hud-border-dark)] bg-[#0B0D10] p-5 text-white shadow-xl sm:flex-row sm:items-center sm:p-6"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#10B954]" />
            <span className="tabular-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white/65">
              READY · 3D EXPLORER
            </span>
          </div>
          <h3 className="mt-1.5 text-lg font-bold tracking-tight text-white">
            Inspect before &amp; after on the 3D street twin
          </h3>
          <p className="mt-0.5 text-xs text-white/65">
            Switch between Current Reality and Lux3D Upgrade, drop new problem
            pins, and export Naira (₦) planner briefs.
          </p>
        </div>
        <Link
          href={exploreHref}
          className="hud-transition inline-flex shrink-0 items-center gap-2 rounded-full border border-[#111312] bg-[#10B954] px-6 py-2.5 text-xs font-bold text-[#111312] hover:bg-[#0EA349] active:scale-[0.98]"
        >
          <Box className="h-4 w-4" />
          Open 3D Explorer
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
