import { NextResponse } from 'next/server';
import { formatAholoError, startLux3dGeneration } from '@/lib/aholo';
import type { Lux3dGeneratePayload } from '@/types/aholo';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Lux3dGeneratePayload>;
    const mode = body.mode ?? (body.img || body.imgs?.length ? 'img-to-3d' : 'text-to-3d');
    const version = body.version ?? 'G1-Turbo';

    if (mode === 'text-to-3d' && !body.prompt?.trim()) {
      return NextResponse.json(
        { error: 'Please provide a text prompt describing the 3D upgrade asset.' },
        { status: 400 }
      );
    }

    if (
      mode === 'img-to-3d' &&
      !body.img?.trim() &&
      (!body.imgs || body.imgs.length === 0)
    ) {
      return NextResponse.json(
        { error: 'Please provide an image URL or upload a photo for img-to-3d.' },
        { status: 400 }
      );
    }

    const { taskId } = await startLux3dGeneration({
      mode,
      prompt: body.prompt,
      img: body.img,
      imgs: body.imgs,
      version,
      style: body.style ?? 'photorealistic',
      outputFormat: body.outputFormat ?? ['glb', 'zip'],
      enablePbr: body.enablePbr ?? true,
      aiPredictSize: body.aiPredictSize ?? true,
    });

    return NextResponse.json(
      {
        taskId,
        mode,
        version,
        status: 'pending',
      },
      { status: 200 }
    );
  } catch (err) {
    const formatted = formatAholoError(err);
    return NextResponse.json(
      { error: formatted.error, code: formatted.code },
      { status: formatted.status }
    );
  }
}
