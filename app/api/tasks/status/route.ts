import { NextResponse } from 'next/server';
import {
  formatAholoError,
  getLux3dTaskStatus,
  getWorldTaskStatus,
} from '@/lib/aholo';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id')?.trim();

    if (!type || (type !== 'lux3d' && type !== 'world')) {
      return NextResponse.json(
        { error: 'Query parameter "type" must be "lux3d" or "world".' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Query parameter "id" (taskId or worldId) is required.' },
        { status: 400 }
      );
    }

    const result =
      type === 'lux3d'
        ? await getLux3dTaskStatus(id)
        : await getWorldTaskStatus(id);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const formatted = formatAholoError(err);
    return NextResponse.json(
      { error: formatted.error, code: formatted.code },
      { status: formatted.status }
    );
  }
}
