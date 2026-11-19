import { NextResponse } from 'next/server';
import { formatAholoError, startWorldTask } from '@/lib/aholo';
import type { WorldReconstructPayload } from '@/types/aholo';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WorldReconstructPayload;
    const mode = body.mode ?? 'reconstruct';

    if (mode === 'reconstruct' && (!body.resources || body.resources.length === 0)) {
      return NextResponse.json(
        {
          error:
            'Provide uploaded street video (.mp4/.mov) or at least 20 photos to start 3DGS reconstruction.',
        },
        { status: 400 }
      );
    }

    const { worldId } = await startWorldTask(body);

    return NextResponse.json(
      {
        worldId,
        mode,
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
